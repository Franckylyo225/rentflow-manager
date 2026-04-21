import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractCoords(text: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/place\/[^/]*\/@?(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/,
    /"latitude"\s*:\s*(-?\d+\.\d+)\s*,\s*"longitude"\s*:\s*(-?\d+\.\d+)/,
    /\[(-?\d+\.\d+),\s*(-?\d+\.\d+)\][^[]{0,200}APP_INITIALIZATION_STATE/,
    /APP_INITIALIZATION_STATE[^[]{0,500}\[(-?\d+\.\d+),\s*(-?\d+\.\d+)\]/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      let lat = parseFloat(m[1]);
      let lng = parseFloat(m[2]);
      // For !2d/!3d pattern, order is lng,lat — detect by range
      if (p.source.includes("!2d") && Math.abs(lat) > 90) {
        [lat, lng] = [lng, lat];
      }
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

async function resolveUrl(url: string, depth = 0): Promise<{ finalUrl: string; html: string } | null> {
  if (depth > 5) return null;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await res.text();
    return { finalUrl: res.url, html };
  } catch {
    return null;
  }
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

    console.log("[resolve-map-link] Input URL:", url);

    // 1. Direct extraction
    let coords = extractCoords(url);
    if (coords) {
      console.log("[resolve-map-link] Found in input URL:", coords);
      return new Response(JSON.stringify(coords), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Follow redirects
    const resolved = await resolveUrl(url);
    if (!resolved) {
      return new Response(JSON.stringify({ error: "Impossible d'accéder au lien" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("[resolve-map-link] Final URL:", resolved.finalUrl);

    // 3. Try final URL
    coords = extractCoords(resolved.finalUrl);
    if (coords) {
      console.log("[resolve-map-link] Found in final URL:", coords);
      return new Response(JSON.stringify(coords), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Try HTML body (handles JS-driven redirects + embedded data)
    coords = extractCoords(resolved.html);
    if (coords) {
      console.log("[resolve-map-link] Found in HTML:", coords);
      return new Response(JSON.stringify(coords), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Look for meta refresh / canonical / og:url and follow
    const metaPatterns = [
      /<meta[^>]+http-equiv=["']refresh["'][^>]+url=([^"'>\s]+)/i,
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
      /"(https:\/\/(?:www\.)?google\.[^"]*\/maps\/[^"]+)"/i,
    ];
    for (const p of metaPatterns) {
      const m = resolved.html.match(p);
      if (m) {
        const nextUrl = m[1].replace(/&amp;/g, "&");
        console.log("[resolve-map-link] Following meta URL:", nextUrl);
        coords = extractCoords(nextUrl);
        if (coords) {
          return new Response(JSON.stringify(coords), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const next = await resolveUrl(nextUrl, 1);
        if (next) {
          coords = extractCoords(next.finalUrl) || extractCoords(next.html);
          if (coords) {
            console.log("[resolve-map-link] Found via meta follow:", coords);
            return new Response(JSON.stringify(coords), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      }
    }

    console.log("[resolve-map-link] No coords found. HTML preview:", resolved.html.substring(0, 500));
    return new Response(
      JSON.stringify({ error: "Coordonnées non trouvées. Ouvrez le lien dans Google Maps puis copiez l'URL complète depuis la barre d'adresse (elle doit contenir '@latitude,longitude')." }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[resolve-map-link] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
