import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      return new Response(JSON.stringify({ error: "Seuls les administrateurs peuvent supprimer une unité" }), {
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

    const { unitId } = await req.json();
    if (!unitId) {
      return new Response(JSON.stringify({ error: "unitId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: unit, error: unitError } = await adminClient
      .from("units")
      .select("id, status, property_id, properties!inner(id, organization_id)")
      .eq("id", unitId)
      .single();

    if (unitError || !unit) {
      return new Response(JSON.stringify({ error: "Unité introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unitOrgId = (unit as any).properties?.organization_id;
    if (unitOrgId !== orgId) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (unit.status === "occupied") {
      return new Response(JSON.stringify({ error: "Impossible de supprimer une unité occupée" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenants, error: tenantsError } = await adminClient
      .from("tenants")
      .select("id, is_active")
      .eq("unit_id", unitId);

    if (tenantsError) throw tenantsError;

    const activeTenants = (tenants || []).filter((tenant) => tenant.is_active);
    if (activeTenants.length > 0) {
      return new Response(JSON.stringify({ error: "Des locataires actifs sont encore liés à cette unité" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantIds = (tenants || []).map((tenant) => tenant.id);

    if (tenantIds.length > 0) {
      const { data: payments, error: paymentsError } = await adminClient
        .from("rent_payments")
        .select("id")
        .in("tenant_id", tenantIds);

      if (paymentsError) throw paymentsError;

      const paymentIds = (payments || []).map((payment) => payment.id);

      if (paymentIds.length > 0) {
        const { error: escalationError } = await adminClient
          .from("escalation_tasks")
          .delete()
          .in("rent_payment_id", paymentIds);
        if (escalationError) throw escalationError;

        const { error: paymentRecordsError } = await adminClient
          .from("payment_records")
          .delete()
          .in("rent_payment_id", paymentIds);
        if (paymentRecordsError) throw paymentRecordsError;

        const { error: smsHistoryError } = await adminClient
          .from("sms_history")
          .update({ rent_payment_id: null })
          .in("rent_payment_id", paymentIds);
        if (smsHistoryError) throw smsHistoryError;

        const { error: paymentsDeleteError } = await adminClient
          .from("rent_payments")
          .delete()
          .in("id", paymentIds);
        if (paymentsDeleteError) throw paymentsDeleteError;
      }

      const { error: terminationsError } = await adminClient
        .from("bail_terminations")
        .delete()
        .in("tenant_id", tenantIds);
      if (terminationsError) throw terminationsError;

      const { error: tenantsDeleteError } = await adminClient
        .from("tenants")
        .delete()
        .in("id", tenantIds);
      if (tenantsDeleteError) throw tenantsDeleteError;
    }

    const { error: unitDeleteError } = await adminClient
      .from("units")
      .delete()
      .eq("id", unitId);
    if (unitDeleteError) throw unitDeleteError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});