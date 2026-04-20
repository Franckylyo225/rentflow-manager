import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MONSMS_API_KEY = Deno.env.get("MONSMS_API_KEY");
    const MONSMS_COMPANY_ID = Deno.env.get("MONSMS_COMPANY_ID");
    if (!MONSMS_API_KEY || !MONSMS_COMPANY_ID) {
      throw new Error("MonSMS credentials not configured");
    }

    const res = await fetch("https://rest.monsms.pro/v1/transaction/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: MONSMS_API_KEY, companyId: MONSMS_COMPANY_ID }),
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
