import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MONSMS_URL = "https://rest.monsms.pro/v1/campaign/create";

// MonSMS attend le numéro sans le '+' (ex: 22500000000)
function formatPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\.()+ ]/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ───── Authentication ─────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");

    // Allow internal service-role calls (from other edge functions like send-sms-2fa-code)
    const isServiceRole = token === supabaseServiceKey;

    let resolvedOrgId: string | null = null;
    let resolvedSenderName: string | null = null;
    let isAdminOrGestionnaire = false;

    if (!isServiceRole) {
      // Verify user JWT
      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ success: false, error: "Non autorisé" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const userId = claimsData.claims.sub as string;

      // Resolve user's organization + role server-side (don't trust the body)
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("organization_id, is_approved")
        .eq("user_id", userId)
        .single();

      if (!profile || !profile.is_approved) {
        return new Response(
          JSON.stringify({ success: false, error: "Compte non approuvé" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      isAdminOrGestionnaire = roleRow?.role === "admin" || roleRow?.role === "gestionnaire";
      if (!isAdminOrGestionnaire) {
        return new Response(
          JSON.stringify({ success: false, error: "Privilèges insuffisants" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      resolvedOrgId = profile.organization_id;
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("sms_sender_name")
        .eq("id", resolvedOrgId)
        .single();
      resolvedSenderName = org?.sms_sender_name || null;
    }

    const MONSMS_API_KEY = Deno.env.get("MONSMS_API_KEY");
    if (!MONSMS_API_KEY) throw new Error("MONSMS_API_KEY is not configured");
    const MONSMS_COMPANY_ID = Deno.env.get("MONSMS_COMPANY_ID");
    if (!MONSMS_COMPANY_ID) throw new Error("MONSMS_COMPANY_ID is not configured");

    const body = await req.json();
    const { to, message, recipientName, templateKey } = body;

    // Service-role callers may pass organizationId / senderName explicitly (trusted internal call)
    let organizationId = resolvedOrgId;
    let senderName = resolvedSenderName;
    if (isServiceRole) {
      organizationId = body.organizationId ?? null;
      senderName = (body.senderName && String(body.senderName).trim()) || senderName;
    }
    const finalSenderName = (senderName && String(senderName).trim()) || "SCI BINIEBA";

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs 'to' et 'message' requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic input validation
    if (typeof to !== "string" || typeof message !== "string" || message.length > 1600) {
      return new Response(
        JSON.stringify({ success: false, error: "Paramètres invalides" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientPhone = formatPhoneNumber(to);

    const payload = {
      apiKey: MONSMS_API_KEY,
      companyId: MONSMS_COMPANY_ID,
      senderId: finalSenderName,
      contacts: [{ phone: recipientPhone }],
      text: message,
      type: "SMS",
    };

    console.log(`Sending SMS via MonSMS Pro to=${recipientPhone}`);

    const smsResponse = await fetch(MONSMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const smsData = await smsResponse.json();
    console.log(`MonSMS response [${smsResponse.status}]: ${JSON.stringify(smsData)}`);

    const isSuccess = smsResponse.ok && smsData?.success === true;
    const messageId = smsData?.data?.id || smsData?.data?.campaignId || null;

    // Log to sms_history (server-derived organizationId only)
    if (organizationId) {
      await supabaseAdmin.from("sms_history").insert({
        organization_id: organizationId,
        recipient_phone: recipientPhone,
        recipient_name: recipientName || "",
        message: message,
        sender_name: finalSenderName,
        status: isSuccess ? "sent" : "failed",
        error_message: isSuccess ? null : JSON.stringify(smsData?.error ?? smsData),
        orange_message_id: messageId,
        template_key: templateKey || null,
      });
    }

    if (!isSuccess) {
      throw new Error(`MonSMS API error [${smsResponse.status}]: ${JSON.stringify(smsData?.error ?? smsData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: smsData?.data ?? smsData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending SMS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
