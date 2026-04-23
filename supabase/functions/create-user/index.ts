import { createClient } from "npm:@supabase/supabase-js@2";

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
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller with anon client
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

    // Check caller is admin using service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("is_org_admin", { _user_id: caller.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Seuls les administrateurs peuvent créer des utilisateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's org
    const { data: orgId } = await adminClient.rpc("get_user_org_id", { _user_id: caller.id });
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Organisation introuvable" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, full_name, role, custom_role_id, city_ids } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Email, mot de passe et nom complet requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user via admin API (auto-confirms email)
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      const msg = createError.message.includes("already been registered")
        ? "Cet email est déjà utilisé"
        : createError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUserData.user.id;

    // The handle_new_user trigger will create profile, org, and default role.
    // We need to override: move user to caller's org instead of the auto-created one.

    // Wait briefly for trigger to complete
    await new Promise((r) => setTimeout(r, 1000));

    // Get the auto-created org for this user (to delete it later)
    const { data: autoProfile } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("user_id", newUserId)
      .single();

    const autoOrgId = autoProfile?.organization_id;

    // Update profile to caller's org
    await adminClient
      .from("profiles")
      .update({ organization_id: orgId })
      .eq("user_id", newUserId);

    // Update user_roles
    const updateData: Record<string, unknown> = {
      role: role || "gestionnaire",
    };
    if (custom_role_id) updateData.custom_role_id = custom_role_id;
    if (city_ids) updateData.city_ids = city_ids;

    await adminClient
      .from("user_roles")
      .update(updateData)
      .eq("user_id", newUserId);

    // Clean up auto-created org and its data (if different from caller's org)
    if (autoOrgId && autoOrgId !== orgId) {
      // Delete related data in order
      await adminClient.from("notification_templates").delete().eq("organization_id", autoOrgId);
      await adminClient.from("expense_categories").delete().eq("organization_id", autoOrgId);
      await adminClient.from("custom_roles").delete().eq("organization_id", autoOrgId);
      await adminClient.from("cities").delete().eq("organization_id", autoOrgId);
      await adminClient.from("countries").delete().eq("organization_id", autoOrgId);
      await adminClient.from("organizations").delete().eq("id", autoOrgId);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
