import { forwardRef, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Asset {
  id: string;
  title: string;
  locality: string;
  asset_type: string;
  latitude?: number | null;
  longitude?: number | null;
  asset_holders?: { full_name: string } | null;
}

interface PatrimoineMapProps {
  assets: Asset[];
  onAssetClick: (id: string) => void;
}

export const PatrimoineMap = forwardRef<HTMLDivElement, PatrimoineMapProps>(function PatrimoineMap({ assets, onAssetClick }, ref) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  const geoAssets = assets.filter((a) => a.latitude && a.longitude);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [6.8, -5.3],
      zoom: 7,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markers: L.Marker[] = [];

    geoAssets.forEach((asset) => {
      const marker = L.marker([asset.latitude!, asset.longitude!], {
        icon: L.divIcon({
          className: "custom-marker",
          html: `<div style="background:hsl(var(--primary));width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      });

      marker.bindPopup(`
        <div style="min-width:160px">
          <strong>${asset.title}</strong><br/>
          <span style="color:#666;font-size:12px">${asset.locality || ""}</span><br/>
          ${asset.asset_holders?.full_name ? `<span style="font-size:12px">👤 ${asset.asset_holders.full_name}</span><br/>` : ""}
          <a href="#" onclick="window.__patrimoineNav('${asset.id}');return false;" style="color:hsl(var(--primary));font-size:12px;text-decoration:underline;margin-top:4px;display:inline-block">Voir le détail →</a>
        </div>
      `);

      marker.addTo(map);
      markers.push(marker);
    });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    mapInstance.current = map;
    requestAnimationFrame(() => map.invalidateSize());

    (window as Window & { __patrimoineNav?: (id: string) => void }).__patrimoineNav = (id: string) => {
      onAssetClick(id);
    };

    return () => {
      delete (window as Window & { __patrimoineNav?: (id: string) => void }).__patrimoineNav;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [assets, geoAssets, onAssetClick]);

  if (geoAssets.length === 0) {
    return (
      <Card ref={ref}>
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <MapPin className="h-10 w-10 opacity-40" />
          <p className="text-sm">Aucun actif géolocalisé. Ajoutez un lien Google Maps à vos actifs pour les voir sur la carte.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={ref} className="overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{geoAssets.length} actif{geoAssets.length > 1 ? "s" : ""} géolocalisé{geoAssets.length > 1 ? "s" : ""} sur {assets.length}</span>
        </div>
        <div ref={mapRef} style={{ height: "500px", width: "100%" }} />
      </CardContent>
    </Card>
  );
});
