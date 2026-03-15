import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ORANGE_TOKEN_URL = "https://api.orange.com/oauth/v1/token";
const ORANGE_SMS_URL = "https://api.orange.com/smsmessaging/v1/outbound";

async function getOrangeAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(ORANGE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ORANGE_CLIENT_ID = Deno.env.get("ORANGE_CLIENT_ID");
    if (!ORANGE_CLIENT_ID) throw new Error("ORANGE_CLIENT_ID is not configured");

    const ORANGE_CLIENT_SECRET = Deno.env.get("ORANGE_CLIENT_SECRET");
    if (!ORANGE_CLIENT_SECRET) throw new Error("ORANGE_CLIENT_SECRET is not configured");

    const { to, message, senderName } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'to' or 'message' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number: ensure it starts with "tel:+"
    let phoneNumber = to.replace(/\s+/g, "");
    if (!phoneNumber.startsWith("+")) {
      phoneNumber = "+" + phoneNumber;
    }
    const senderAddress = `tel:${phoneNumber}`;

    // Get OAuth2 token
    const accessToken = await getOrangeAccessToken(ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET);

    // Send SMS via Orange API
    // The sender number needs to be your Orange dev number
    const encodedSender = encodeURIComponent(senderAddress);
    const smsPayload = {
      outboundSMSMessageRequest: {
        address: senderAddress,
        senderAddress: senderAddress,
        senderName: senderName || "Rentflow",
        outboundSMSTextMessage: {
          message: message,
        },
      },
    };

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
