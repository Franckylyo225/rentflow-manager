import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Building2, LandPlot, FileCheck, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const typeIcons: Record<string, React.ReactNode> = {
  terrain: <LandPlot className="h-5 w-5" />,
  maison: <Home className="h-5 w-5" />,
  titre: <FileCheck className="h-5 w-5" />,
  autre: <Building2 className="h-5 w-5" />,
};

const typeLabels: Record<string, string> = {
  terrain: "Terrain",
  maison: "Maison",
  titre: "Titre de propriété",
  autre: "Autre",
};

interface AssetHeaderProps {
  asset: any;
  documentsHaveAcd: boolean;
}

export function AssetHeader({ asset, documentsHaveAcd }: AssetHeaderProps) {
  const navigate = useNavigate();
  const typeLabel = typeLabels[asset.asset_type as string] || asset.asset_type;
  const icon = typeIcons[asset.asset_type as string] || typeIcons.autre;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => navigate("/patrimoine")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-primary">{icon}</div>
            <h1 className="text-2xl font-bold text-foreground truncate">{asset.title}</h1>
            <Badge variant="outline" className="shrink-0">{typeLabel}</Badge>
            {documentsHaveAcd ? (
              <Badge className="bg-success/10 text-success border-success/20 shrink-0" variant="outline">
                ✓ Dossier complet
              </Badge>
            ) : (
              <Badge className="bg-warning/10 text-warning border-warning/20 shrink-0" variant="outline">
                ⏳ Dossier en cours
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {asset.locality && (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{asset.locality}</span>
            )}
            {asset.subdivision_name && <span>Lot : {asset.subdivision_name}</span>}
            {asset.created_at && (
              <span>Ajouté le {new Date(asset.created_at).toLocaleDateString("fr-FR")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
