import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: "Non autorisé" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Only super_admin allowed
    const { data: isSuper } = await adminClient.rpc("is_super_admin", { _user_id: caller.id });
    if (!isSuper) return json({ error: "Seul un Super Admin peut effectuer cette action" }, 403);

    const { action, target_user_id, new_password } = await req.json();
    if (!action || !target_user_id) return json({ error: "Paramètres manquants" }, 400);
    if (target_user_id === caller.id) return json({ error: "Action non autorisée sur votre propre compte" }, 400);

    if (action === "reset_password") {
      if (!new_password || typeof new_password !== "string" || new_password.length < 8) {
        return json({ error: "Mot de passe invalide (min. 8 caractères)" }, 400);
      }
      const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
        password: new_password,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "delete_user") {
      // Get org for cleanup of possibly auto-created org
      const { data: profile } = await adminClient
        .from("profiles")
        .select("organization_id")
        .eq("user_id", target_user_id)
        .maybeSingle();

      // Delete auth user (cascades to profiles/user_roles via FK ON DELETE CASCADE)
      const { error: delErr } = await adminClient.auth.admin.deleteUser(target_user_id);
      if (delErr) return json({ error: delErr.message }, 400);

      // Best-effort cleanup in case cascade didn't remove them
      await adminClient.from("user_roles").delete().eq("user_id", target_user_id);
      await adminClient.from("profiles").delete().eq("user_id", target_user_id);

      // If the user's organization has no more members, clean it up
      if (profile?.organization_id) {
        const { count } = await adminClient
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", profile.organization_id);
        if ((count ?? 0) === 0) {
          const orgId = profile.organization_id;
          await adminClient.from("notification_templates").delete().eq("organization_id", orgId);
          await adminClient.from("expense_categories").delete().eq("organization_id", orgId);
          await adminClient.from("custom_roles").delete().eq("organization_id", orgId);
          await adminClient.from("cities").delete().eq("organization_id", orgId);
          await adminClient.from("countries").delete().eq("organization_id", orgId);
          await adminClient.from("organizations").delete().eq("id", orgId);
        }
      }

      return json({ success: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (err: any) {
    return json({ error: err?.message || "Erreur interne" }, 500);
  }
});
