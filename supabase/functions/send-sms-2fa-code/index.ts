import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch profile
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("sms_2fa_enabled, sms_2fa_phone, full_name, organization_id")
      .eq("user_id", user.id)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "Profil introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.sms_2fa_enabled || !profile.sms_2fa_phone) {
      return new Response(JSON.stringify({ error: "2FA SMS non configurée" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit : max 3 codes envoyés / 10 min
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("sms_2fa_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Trop de codes envoyés. Réessayez dans 10 minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    await admin.from("sms_2fa_codes").insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    // Get sender name from organization
    let senderName = "SCI Binieba";
    if (profile.organization_id) {
      const { data: org } = await admin
        .from("organizations")
        .select("sms_sender_name")
        .eq("id", profile.organization_id)
        .single();
      if (org?.sms_sender_name) senderName = org.sms_sender_name;
    }

    const message = `Code de connexion: ${code}\nValide 5 min. Ne le partagez avec personne.`;

    // Invoke send-sms function
    const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to: profile.sms_2fa_phone,
        message,
        organizationId: profile.organization_id,
        recipientName: profile.full_name,
        templateKey: "2fa_login",
        senderName,
      }),
    });

    const sendData = await sendResp.json();
    if (!sendResp.ok || !sendData.success) {
      return new Response(JSON.stringify({ error: "Échec d'envoi du SMS", details: sendData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mask phone in response : +225 XX XX XX XX 12
    const phone = profile.sms_2fa_phone;
    const masked = phone.length > 4 ? `••••${phone.slice(-2)}` : phone;

    return new Response(
      JSON.stringify({ success: true, masked_phone: masked }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
