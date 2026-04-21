import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Génère les échéances de loyer pour un mois donné (par défaut le mois courant).
 *
 * Règles métier :
 * - Les échéances sont comptées à partir de la DATE D'AJOUT du locataire (`tenants.created_at`),
 *   et NON à partir de `lease_start`. L'entreprise existe déjà avant l'arrivée sur la plateforme,
 *   on ne génère donc jamais d'échéance rétroactive antérieure à la création du tenant.
 * - Pour le mois d'ajout : génération d'un mois plein à la date d'échéance configurée
 *   (`organizations.rent_due_day`). Pas de prorata.
 * - Idempotent : ne crée pas de doublon si la ligne existe déjà pour (tenant_id, month).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let targetMonth: string | null = null;
    let backfill = false;
    try {
      const body = await req.json();
      if (body?.month) targetMonth = body.month;
      if (body?.backfill === true) backfill = true;
    } catch (_) {
      // pas de body
    }

    const now = new Date();
    const month = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    console.log(`[generate-monthly-rents] month=${month} backfill=${backfill}`);

    // Récupérer les locataires actifs avec created_at + organization
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, rent, created_at, units!inner(property_id, properties!inner(organization_id))")
      .eq("is_active", true);

    if (tenantsError) throw tenantsError;
    if (!tenants || tenants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun locataire actif", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Jour d'échéance par organisation
    const orgIds = [...new Set(tenants.map((t: any) => t.units.properties.organization_id))];
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, rent_due_day")
      .in("id", orgIds);

    const orgDueDay = new Map<string, number>();
    orgs?.forEach((o: any) => orgDueDay.set(o.id, o.rent_due_day || 5));

    // ---- Construction de la liste (tenant, month) à traiter ----
    // En mode normal : seulement le `month` ciblé.
    // En mode backfill : tous les mois entre created_at du tenant et le mois courant.
    type Job = { tenant: any; month: string };
    const jobs: Job[] = [];

    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    for (const t of tenants as any[]) {
      const createdAt = new Date(t.created_at);
      const createdYM = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;

      if (backfill) {
        // Itère depuis le mois d'ajout jusqu'au mois courant (inclus)
        let cursor = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        while (cursor <= end) {
          const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
          jobs.push({ tenant: t, month: ym });
          cursor.setMonth(cursor.getMonth() + 1);
        }
      } else {
        // Mode normal : on ne génère que pour `month`, et seulement si
        // le mois ciblé est >= mois d'ajout du locataire.
        if (month >= createdYM) {
          jobs.push({ tenant: t, month });
        } else {
          console.log(`[skip] tenant=${t.id} ajouté ${createdYM}, on ne génère pas pour ${month}`);
        }
      }
    }

    if (jobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Rien à générer", created: 0, month }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier les paiements existants (pour idempotence)
    const tenantIds = [...new Set(jobs.map(j => j.tenant.id))];
    const months = [...new Set(jobs.map(j => j.month))];
    const { data: existing } = await supabase
      .from("rent_payments")
      .select("tenant_id, month")
      .in("tenant_id", tenantIds)
      .in("month", months);

    const existingSet = new Set((existing || []).map((e: any) => `${e.tenant_id}:${e.month}`));

    // Construire les payments à insérer
    const toInsert = jobs
      .filter(j => !existingSet.has(`${j.tenant.id}:${j.month}`))
      .map(j => {
        const orgId = j.tenant.units.properties.organization_id;
        const dueDay = orgDueDay.get(orgId) || 5;
        const [year, monthNum] = j.month.split("-").map(Number);
        // Sécurise le jour (ex. 31 sur février) en clampant au dernier jour du mois
        const lastDay = new Date(year, monthNum, 0).getDate();
        const safeDay = Math.min(dueDay, lastDay);
        const dueDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;

        return {
          tenant_id: j.tenant.id,
          amount: j.tenant.rent,
          paid_amount: 0,
          due_date: dueDate,
          month: j.month,
          status: "pending" as const,
        };
      });

    if (toInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Toutes les échéances existent déjà", created: 0, month, skipped: jobs.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await supabase.from("rent_payments").insert(toInsert);
    if (insertError) throw insertError;

    console.log(`[generate-monthly-rents] Créées ${toInsert.length} échéances (skipped=${jobs.length - toInsert.length})`);

    return new Response(
      JSON.stringify({
        success: true,
        created: toInsert.length,
        skipped: jobs.length - toInsert.length,
        month,
        backfill,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[generate-monthly-rents] Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
