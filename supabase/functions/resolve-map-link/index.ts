import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractCoords(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL requise" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try direct extraction first
    let coords = extractCoords(url);
    if (coords) {
      return new Response(JSON.stringify(coords), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Follow redirects for short links
    const response = await fetch(url, { redirect: "follow" });
    const finalUrl = response.url;
    coords = extractCoords(finalUrl);

    if (!coords) {
      // Try parsing HTML for meta refresh or og:url
      const html = await response.text();
      const ogMatch = html.match(/content="([^"]*maps[^"]*)"/);
      if (ogMatch) {
        coords = extractCoords(ogMatch[1]);
      }
    }

    if (coords) {
      return new Response(JSON.stringify(coords), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Coordonnées non trouvées dans le lien" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
