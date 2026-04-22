import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin } = await adminClient.rpc("is_org_admin", { _user_id: caller.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Seuls les administrateurs peuvent supprimer un locataire" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: orgId } = await adminClient.rpc("get_user_org_id", { _user_id: caller.id });
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Organisation introuvable" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenantId } = await req.json();
    if (!tenantId || typeof tenantId !== "string") {
      return new Response(JSON.stringify({ error: "tenantId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id, is_active, unit_id, units!inner(id, property_id, properties!inner(id, organization_id))")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Locataire introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantOrgId = (tenant as any).units?.properties?.organization_id;
    if (tenantOrgId !== orgId) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tenant.is_active) {
      return new Response(JSON.stringify({ error: "Impossible de supprimer un locataire actif. Clôturez d'abord son bail." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer tous les paiements liés
    const { data: payments, error: paymentsError } = await adminClient
      .from("rent_payments")
      .select("id")
      .eq("tenant_id", tenantId);
    if (paymentsError) throw paymentsError;

    const paymentIds = (payments || []).map((p) => p.id);

    if (paymentIds.length > 0) {
      const { error: escErr } = await adminClient
        .from("escalation_tasks")
        .delete()
        .in("rent_payment_id", paymentIds);
      if (escErr) throw escErr;

      const { error: prErr } = await adminClient
        .from("payment_records")
        .delete()
        .in("rent_payment_id", paymentIds);
      if (prErr) throw prErr;

      const { error: smsErr } = await adminClient
        .from("sms_history")
        .update({ rent_payment_id: null })
        .in("rent_payment_id", paymentIds);
      if (smsErr) throw smsErr;

      const { error: rpErr } = await adminClient
        .from("rent_payments")
        .delete()
        .in("id", paymentIds);
      if (rpErr) throw rpErr;
    }

    // Supprimer fins de bail
    const { error: btErr } = await adminClient
      .from("bail_terminations")
      .delete()
      .eq("tenant_id", tenantId);
    if (btErr) throw btErr;

    // Supprimer le locataire
    const { error: delErr } = await adminClient
      .from("tenants")
      .delete()
      .eq("id", tenantId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
