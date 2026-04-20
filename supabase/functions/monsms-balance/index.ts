import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let organizationId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        organizationId = body?.organizationId ?? null;
      } catch (_) {
        // ignore
      }
    }

    let apiKey: string | null = null;
    let companyId: string | null = null;

    if (organizationId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("monsms_api_key, monsms_company_id")
        .eq("id", organizationId)
        .maybeSingle();
      if (org) {
        apiKey = org.monsms_api_key || null;
        companyId = org.monsms_company_id || null;
      }
    }

    if (!apiKey) apiKey = Deno.env.get("MONSMS_API_KEY") || null;
    if (!companyId) companyId = Deno.env.get("MONSMS_COMPANY_ID") || null;

    if (!apiKey || !companyId) {
      throw new Error("MonSMS credentials not configured");
    }

    const res = await fetch("https://rest.monsms.pro/v1/transaction/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, companyId }),
    });

    const data = await res.json();
    if (!data?.success) {
      throw new Error(`MonSMS API error: ${JSON.stringify(data?.error ?? data)}`);
    }

    // Get most recent stat (highest createdAt) for current balance
    const stats = Array.isArray(data.data) ? data.data : [];
    const latest = stats.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    return new Response(
      JSON.stringify({
        success: true,
        creditAvailable: latest?.creditAvailable ?? 0,
        creditUsed: latest?.creditUsed ?? 0,
        lastUpdate: latest?.createdAt ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching MonSMS balance:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
