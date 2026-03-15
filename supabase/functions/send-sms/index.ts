import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Orange Developer OAuth & SMS endpoints
const ORANGE_TOKEN_URLS = [
  "https://api.orange.com/oauth/v3/token",
  "https://api.orange.com/oauth/v2/token",
];
const ORANGE_SMS_URL = "https://api.orange.com/smsmessaging/v1/outbound";

async function getOrangeAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);

  for (const tokenUrl of ORANGE_TOKEN_URLS) {
    console.log(`Trying OAuth endpoint: ${tokenUrl}`);
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (response.ok) {
      const data = await response.json();
      console.log("OAuth token obtained successfully");
      return data.access_token;
    }

    const errorBody = await response.text();
    console.log(`OAuth endpoint ${tokenUrl} failed [${response.status}]: ${errorBody}`);

    // If it's not a 404, don't try the next URL — it's a real error
    if (response.status !== 404) {
      throw new Error(`Orange OAuth failed [${response.status}]: ${errorBody}`);
    }
  }

  throw new Error("All Orange OAuth endpoints failed with 404. Check your Client ID/Secret.");
}

function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, dots
  let cleaned = phone.replace(/[\s\-\.()]/g, "");
  // Ensure starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ORANGE_CLIENT_ID = Deno.env.get("ORANGE_CLIENT_ID");
    if (!ORANGE_CLIENT_ID) throw new Error("ORANGE_CLIENT_ID is not configured");

    const ORANGE_CLIENT_SECRET = Deno.env.get("ORANGE_CLIENT_SECRET");
    if (!ORANGE_CLIENT_SECRET) throw new Error("ORANGE_CLIENT_SECRET is not configured");

    // Optional: sender phone number from Orange Developer app
    const ORANGE_SENDER_NUMBER = Deno.env.get("ORANGE_SENDER_NUMBER");

    const { to, message, senderName, senderNumber } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs 'to' et 'message' requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientPhone = formatPhoneNumber(to);
    const recipientAddress = `tel:${recipientPhone}`;

    // Sender: use provided number, env variable, or fallback to "tel:+22500000000" 
    // In Orange Dev sandbox, senderAddress must match your registered dev number
    const senderPhone = senderNumber 
      ? formatPhoneNumber(senderNumber) 
      : ORANGE_SENDER_NUMBER 
        ? formatPhoneNumber(ORANGE_SENDER_NUMBER)
        : recipientPhone; // Fallback for sandbox: some configs allow same number
    const senderAddr = `tel:${senderPhone}`;

    console.log(`Sending SMS: from=${senderAddr} to=${recipientAddress}`);

    // Get OAuth2 token
    const accessToken = await getOrangeAccessToken(ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET);

    // Send SMS via Orange API
    const encodedSender = encodeURIComponent(senderAddr);
    const smsPayload = {
      outboundSMSMessageRequest: {
        address: recipientAddress,
        senderAddress: senderAddr,
        senderName: senderName || "Rentflow",
        outboundSMSTextMessage: {
          message: message,
        },
      },
    };

    console.log(`SMS API URL: ${ORANGE_SMS_URL}/${encodedSender}/requests`);
    console.log(`SMS Payload: ${JSON.stringify(smsPayload)}`);

    const smsResponse = await fetch(
      `${ORANGE_SMS_URL}/${encodedSender}/requests`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      }
    );

    const smsData = await smsResponse.json();
    console.log(`SMS API response [${smsResponse.status}]: ${JSON.stringify(smsData)}`);

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
