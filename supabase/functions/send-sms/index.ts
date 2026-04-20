import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { to, message, organizationId, recipientName, templateKey, senderName } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs 'to' et 'message' requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve credentials: organization first, then global secrets
    let apiKey: string | null = null;
    let companyId: string | null = null;
    let orgSenderId: string | null = null;
    let orgFallbackName: string | null = null;

    if (organizationId) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("monsms_api_key, monsms_company_id, monsms_sender_id, sms_sender_name")
        .eq("id", organizationId)
        .maybeSingle();
      if (org) {
        apiKey = org.monsms_api_key || null;
        companyId = org.monsms_company_id || null;
        orgSenderId = org.monsms_sender_id || null;
        orgFallbackName = org.sms_sender_name || null;
      }
    }

    if (!apiKey) apiKey = Deno.env.get("MONSMS_API_KEY") || null;
    if (!companyId) companyId = Deno.env.get("MONSMS_COMPANY_ID") || null;

    if (!apiKey) throw new Error("MonSMS API Key manquante (configurez-la dans Paramètres > Notifications)");
    if (!companyId) throw new Error("MonSMS Company ID manquant (configurez-le dans Paramètres > Notifications)");

    const recipientPhone = formatPhoneNumber(to);
    const resolvedSenderId =
      (senderName && String(senderName).trim()) ||
      orgSenderId ||
      orgFallbackName ||
      Deno.env.get("MONSMS_SENDER_ID") ||
      "MonSMS";

    const payload = {
      apiKey,
      companyId,
      senderId: resolvedSenderId,
      contacts: [{ phone: recipientPhone }],
      text: message,
      type: "SMS",
    };

    console.log(`Sending SMS via MonSMS Pro to=${recipientPhone} senderId=${resolvedSenderId}`);

    const smsResponse = await fetch(MONSMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const smsData = await smsResponse.json();
    console.log(`MonSMS response [${smsResponse.status}]: ${JSON.stringify(smsData)}`);

    const isSuccess = smsResponse.ok && smsData?.success === true;
    const messageId = smsData?.data?.id || smsData?.data?.campaignId || null;

    // Log to sms_history
    if (organizationId) {
      await supabaseAdmin.from("sms_history").insert({
        organization_id: organizationId,
        recipient_phone: recipientPhone,
        recipient_name: recipientName || "",
        message: message,
        sender_name: resolvedSenderId,
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
