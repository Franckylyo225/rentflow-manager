import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONSMS_BASE_URL = "https://rest.monsms.pro/v1";

function resolveMonSmsStatus(data: any): { status: string; errorMessage: string | null } {
  const rawStatus = String(data?.status ?? "").toUpperCase();
  if (rawStatus === "SENT") return { status: "sent", errorMessage: null };
  if (rawStatus === "FAILED") return { status: "failed", errorMessage: "Échec signalé par MonSMS" };
  if (rawStatus === "PENDING") return { status: "pending", errorMessage: "Expédition opérateur en attente chez MonSMS" };

  const stats = data?.stats;
  if (stats && Number(stats.total ?? 0) > 0) {
    if (Number(stats.sent ?? 0) >= Number(stats.total ?? 0)) return { status: "sent", errorMessage: null };
    if (Number(stats.failed ?? 0) > 0 && Number(stats.pending ?? 0) === 0) {
      return { status: "failed", errorMessage: "Échec signalé par MonSMS" };
    }
  }

  const creditUsed = Number(data?.creditUsed ?? 0);
  if (creditUsed > 0) return { status: "sent", errorMessage: null };
  return { status: "pending", errorMessage: "Campagne créée chez MonSMS, expédition opérateur non encore confirmée" };
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
