import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function buildDeliveryUrl(orangeMessageId: string, recipientPhone: string): string | null {
  if (!orangeMessageId) return null;

  if (orangeMessageId.startsWith("http://") || orangeMessageId.startsWith("https://")) {
    return orangeMessageId.endsWith("/deliveryInfos")
      ? orangeMessageId
      : `${orangeMessageId}/deliveryInfos`;
  }

  const requestId = orangeMessageId.trim();
  if (!requestId) return null;

  const recipient = formatPhoneNumber(recipientPhone);
  const sender = getSenderNumberFromRecipient(recipient);
  const encodedSender = `tel%3A%2B${sender}`;
  return `${ORANGE_SMS_URL}/${encodedSender}/requests/${requestId}/deliveryInfos`;
}

async function getOrangeAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(ORANGE_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
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

async function getOrganizationIdFromAuth(req: Request, supabaseUrl: string): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!anonKey) return null;

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) return null;

  const { data, error } = await supabaseUser
    .from("profiles")
    .select("organization_id")
    .eq("user_id", claimsData.claims.sub)
    .maybeSingle();

  if (error || !data?.organization_id) return null;
  return data.organization_id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ORANGE_CLIENT_ID = Deno.env.get("ORANGE_CLIENT_ID");
    const ORANGE_CLIENT_SECRET = Deno.env.get("ORANGE_CLIENT_SECRET");

    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Backend config manquante");
    if (!ORANGE_CLIENT_ID || !ORANGE_CLIENT_SECRET) throw new Error("Configuration Orange manquante");

    const organizationId = await getOrganizationIdFromAuth(req, supabaseUrl);
    if (!organizationId) {
      return new Response(JSON.stringify({ success: false, error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const accessToken = await getOrangeAccessToken(ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET);

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from("sms_history")
      .select("id, status, orange_message_id, recipient_phone")
      .eq("organization_id", organizationId)
      .not("orange_message_id", "is", null)
      .in("status", ["pending", "sent", "DeliveredToNetwork", "DeliveryUncertain", "MessageWaiting"])
      .order("created_at", { ascending: false })
      .limit(30);

    if (fetchError) {
      throw new Error(`Erreur lecture historique SMS: ${fetchError.message}`);
    }

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ success: true, checked: 0, updated: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const deliveryUrl = buildDeliveryUrl(row.orange_message_id ?? "", row.recipient_phone);
      if (!deliveryUrl) continue;

      try {
        const drResponse = await fetch(deliveryUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });

        if (!drResponse.ok) {
          const errorText = await drResponse.text();
          errors.push(`DR ${row.id} [${drResponse.status}] ${errorText}`);
          continue;
        }

        const drPayload = await drResponse.json();
        const deliveryInfo = drPayload?.deliveryInfoList?.deliveryInfo;
        const deliveryStatus = Array.isArray(deliveryInfo)
          ? deliveryInfo[0]?.deliveryStatus
          : deliveryInfo?.deliveryStatus;

        if (!deliveryStatus) continue;

        if (deliveryStatus !== row.status) {
          const { error: updateError } = await supabaseAdmin
            .from("sms_history")
            .update({
              status: deliveryStatus,
              error_message: deliveryStatus === "DeliveryImpossible" ? "Livraison impossible côté opérateur" : null,
            })
            .eq("id", row.id)
            .eq("organization_id", organizationId);

          if (updateError) {
            errors.push(`UPDATE ${row.id}: ${updateError.message}`);
          } else {
            updated += 1;
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        errors.push(`DR ${row.id}: ${msg}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: rows.length,
        updated,
        errors: errors.slice(0, 5),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
