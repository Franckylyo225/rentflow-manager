import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Allow targeting a specific month via body, default to current month
    let targetMonth: string | null = null;
    try {
      const body = await req.json();
      if (body?.month) targetMonth = body.month;
    } catch (_) {
      // no body
    }

    const now = new Date();
    const month = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    console.log(`[generate-monthly-rents] Generating for month: ${month}`);

    // Get all active tenants with their organization
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, rent, units!inner(property_id, properties!inner(organization_id))")
      .eq("is_active", true);

    if (tenantsError) throw tenantsError;
    if (!tenants || tenants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active tenants", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group tenants by org to fetch the rent_due_day per org
    const orgIds = [...new Set(tenants.map((t: any) => t.units.properties.organization_id))];
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, rent_due_day")
      .in("id", orgIds);

    const orgDueDay = new Map<string, number>();
    orgs?.forEach((o: any) => orgDueDay.set(o.id, o.rent_due_day || 5));

    // Check which tenants already have a payment for this month
    const tenantIds = tenants.map((t: any) => t.id);
    const { data: existing } = await supabase
      .from("rent_payments")
      .select("tenant_id")
      .eq("month", month)
      .in("tenant_id", tenantIds);

    const existingSet = new Set(existing?.map((e: any) => e.tenant_id) || []);

    // Build payments to insert
    const [year, monthNum] = month.split("-").map(Number);
    const toInsert = tenants
      .filter((t: any) => !existingSet.has(t.id))
      .map((t: any) => {
        const orgId = t.units.properties.organization_id;
        const dueDay = orgDueDay.get(orgId) || 5;
        const dueDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
        return {
          tenant_id: t.id,
          amount: t.rent,
          paid_amount: 0,
          due_date: dueDate,
          month,
          status: "pending" as const,
        };
      });

    if (toInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All payments already exist", created: 0, month }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await supabase.from("rent_payments").insert(toInsert);
    if (insertError) throw insertError;

    console.log(`[generate-monthly-rents] Created ${toInsert.length} payments for ${month}`);

    return new Response(
      JSON.stringify({ success: true, created: toInsert.length, month, skipped: existingSet.size }),
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
