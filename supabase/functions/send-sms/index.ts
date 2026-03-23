import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ORANGE_TOKEN_URL = "https://api.orange.com/oauth/v3/token";
const ORANGE_SMS_URL = "https://api.orange.com/smsmessaging/v1/outbound";

const COUNTRY_SENDER_NUMBERS: Record<string, string> = {
  "225": "2250000",
  "237": "2370000",
  "226": "2260000",
  "224": "2240000",
  "245": "2450000",
  "243": "2430000",
  "231": "2310000",
  "223": "2230000",
  "261": "2610000",
  "221": "2210000",
  "216": "2160000",
  "267": "2670000",
  "962": "9620000",
};

async function getOrangeAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(ORANGE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Orange OAuth failed [${response.status}]: ${errorBody}`);
  }

  const data = await response.json();
  return data.access_token;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.()]/g, "");
  if (!cleaned.startsWith("+")) cleaned = "+" + cleaned;
  return cleaned;
}

function getSenderNumberFromRecipient(recipientPhone: string): string {
  const withoutPlus = recipientPhone.replace("+", "");
  for (const [prefix, senderNum] of Object.entries(COUNTRY_SENDER_NUMBERS)) {
    if (withoutPlus.startsWith(prefix)) return senderNum;
  }
  return withoutPlus.substring(0, 3) + "0000";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase admin client for logging
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const ORANGE_CLIENT_ID = Deno.env.get("ORANGE_CLIENT_ID");
    if (!ORANGE_CLIENT_ID) throw new Error("ORANGE_CLIENT_ID is not configured");
    const ORANGE_CLIENT_SECRET = Deno.env.get("ORANGE_CLIENT_SECRET");
    if (!ORANGE_CLIENT_SECRET) throw new Error("ORANGE_CLIENT_SECRET is not configured");

    const { to, message, senderName, senderNumber, organizationId, recipientName, templateKey } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs 'to' et 'message' requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientPhone = formatPhoneNumber(to);
    const recipientAddress = `tel:${recipientPhone}`;
    
    // Use configured sender number if provided, otherwise auto-detect from recipient country
    const rawSenderNumber = senderNumber
      ? senderNumber.replace(/[\s\-\.()]/g, "")
      : getSenderNumberFromRecipient(recipientPhone);
    
    // Detect if it's a short code (no + prefix and <= 6 digits) vs international number
    const cleanedNumber = rawSenderNumber.replace(/^\+/, "");
    const isShortCode = cleanedNumber.length <= 6;
    const effectiveSenderNumber = isShortCode ? cleanedNumber : cleanedNumber;
    const senderAddress = isShortCode ? `tel:${effectiveSenderNumber}` : `tel:+${effectiveSenderNumber}`;

    console.log(`Sending SMS: senderAddress=${senderAddress} to=${recipientAddress} (shortCode=${isShortCode})`);

    const accessToken = await getOrangeAccessToken(ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET);

    const encodedSender = isShortCode
      ? `tel%3A${effectiveSenderNumber}`
      : `tel%3A%2B${effectiveSenderNumber}`;
    const smsUrl = `${ORANGE_SMS_URL}/${encodedSender}/requests`;

    const smsPayload = {
      outboundSMSMessageRequest: {
        address: recipientAddress,
        senderAddress: senderAddress,
        ...(senderName ? { senderName } : {}),
        outboundSMSTextMessage: { message },
      },
    };

    const smsResponse = await fetch(smsUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(smsPayload),
    });

    const smsData = await smsResponse.json();
    console.log(`SMS API response [${smsResponse.status}]: ${JSON.stringify(smsData)}`);

    const orangeMessageId = smsData?.outboundSMSMessageRequest?.resourceURL || null;

    // Log to sms_history
    if (organizationId) {
      await supabaseAdmin.from("sms_history").insert({
        organization_id: organizationId,
        recipient_phone: recipientPhone,
        recipient_name: recipientName || "",
        message: message,
        sender_name: senderName || "",
        status: smsResponse.ok ? "sent" : "failed",
        error_message: smsResponse.ok ? null : JSON.stringify(smsData),
        orange_message_id: orangeMessageId,
        template_key: templateKey || null,
      });
    }

    if (!smsResponse.ok) {
      throw new Error(`Orange SMS API error [${smsResponse.status}]: ${JSON.stringify(smsData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: smsData }),
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
