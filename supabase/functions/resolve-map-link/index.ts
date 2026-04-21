import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  // Skip Google consent interstitial
  "Cookie": "CONSENT=YES+cb.20210720-07-p0.en+FX+410; SOCS=CAESHAgBEhJnd3NfMjAyMzA3MjQtMF9SQzIaAmVuIAEaBgiA_LyaBg",
};

function extractCoords(text: string): { lat: number; lng: number } | null {
  const patterns: Array<[RegExp, "latlng" | "lnglat"]> = [
    [/@(-?\d+\.\d+),(-?\d+\.\d+)/, "latlng"],
    [/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, "latlng"],
    [/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/, "latlng"],
    [/[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/, "latlng"],
    [/[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/, "latlng"],
    [/[?&]daddr=(-?\d+\.\d+),(-?\d+\.\d+)/, "latlng"],
    [/\/place\/[^/]*\/@?(-?\d+\.\d+),(-?\d+\.\d+)/, "latlng"],
    [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, "latlng"],
    [/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/, "lnglat"],
    [/"latitude"\s*:\s*(-?\d+\.\d+)\s*,\s*"longitude"\s*:\s*(-?\d+\.\d+)/, "latlng"],
    [/"lat"\s*:\s*(-?\d+\.\d+)\s*,\s*"lng"\s*:\s*(-?\d+\.\d+)/, "latlng"],
    [/data-lat="(-?\d+\.\d+)"\s+data-lng="(-?\d+\.\d+)"/, "latlng"],
    // Google's APP_INITIALIZATION_STATE blob — coordinates appear as [null,null,LAT,LNG]
    /* eslint-disable no-useless-escape */
    [/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/, "latlng"],
  ];

  for (const [pattern, order] of patterns) {
    const match = text.match(pattern);
    if (match) {
      let lat = parseFloat(match[1]);
      let lng = parseFloat(match[2]);
      if (order === "lnglat") [lat, lng] = [lng, lat];
      if (
        !isNaN(lat) && !isNaN(lng) &&
        Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
        !(lat === 0 && lng === 0)
      ) {
        return { lat, lng };
      }
    }
  }
  return null;
}

async function fetchPage(url: string): Promise<{ finalUrl: string; html: string } | null> {
  try {
    const res = await fetch(url, { redirect: "follow", headers: BROWSER_HEADERS });
    const html = await res.text();
    return { finalUrl: res.url, html };
  } catch (e) {
    console.error("[resolve-map-link] fetch error:", (e as Error).message);
    return null;
  }
}

function extractContinueUrl(html: string, finalUrl: string): string | null {
  // Google consent page: look for continue= param or form action
  if (finalUrl.includes("consent.google.com") || html.includes("consent.google.com")) {
    const continueMatch = finalUrl.match(/[?&]continue=([^&]+)/) ||
                          html.match(/name="continue"\s+value="([^"]+)"/) ||
                          html.match(/[?&]continue=([^&"'<>\s]+)/);
    if (continueMatch) {
      try {
        return decodeURIComponent(continueMatch[1].replace(/&amp;/g, "&"));
      } catch {
        return continueMatch[1];
      }
    }
  }
  // Meta refresh / canonical fallback
  const metaPatterns = [
    /<meta[^>]+http-equiv=["']refresh["'][^>]+url=([^"'>\s]+)/i,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const p of metaPatterns) {
    const m = html.match(p);
    if (m) return m[1].replace(/&amp;/g, "&");
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[resolve-map-link] Input:", url);

    // 1. Direct extraction from input
    let coords = extractCoords(url);
    if (coords) {
      console.log("[resolve-map-link] Found in input");
      return new Response(JSON.stringify(coords), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch (follows short-link redirects)
    const page = await fetchPage(url);
    if (!page) {
      return new Response(JSON.stringify({ error: "Impossible d'accéder au lien" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[resolve-map-link] Final URL:", page.finalUrl);

    // 3. Extract from final URL or HTML
    coords = extractCoords(page.finalUrl) || extractCoords(page.html);
    if (coords) {
      console.log("[resolve-map-link] Found after fetch");
      return new Response(JSON.stringify(coords), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Handle consent page → follow continue URL
    const continueUrl = extractContinueUrl(page.html, page.finalUrl);
    if (continueUrl) {
      console.log("[resolve-map-link] Following continue URL:", continueUrl);
      coords = extractCoords(continueUrl);
      if (coords) {
        return new Response(JSON.stringify(coords), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const next = await fetchPage(continueUrl);
      if (next) {
        coords = extractCoords(next.finalUrl) || extractCoords(next.html);
        if (coords) {
          console.log("[resolve-map-link] Found after consent follow");
          return new Response(JSON.stringify(coords), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    console.log("[resolve-map-link] FAIL. HTML preview:", page.html.substring(0, 800));
    return new Response(
      JSON.stringify({
        error:
          "Coordonnées introuvables. Astuce : ouvrez le lien dans Google Maps, puis copiez l'URL complète depuis la barre d'adresse du navigateur (elle doit contenir '@latitude,longitude').",
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[resolve-map-link] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
