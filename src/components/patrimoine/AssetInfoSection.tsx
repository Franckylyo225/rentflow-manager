import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, Landmark, User, Briefcase, FileText } from "lucide-react";
import { useState } from "react";

interface AssetInfoSectionProps {
  asset: any;
}

export function AssetInfoSection({ asset }: AssetInfoSectionProps) {
  const [open, setOpen] = useState(true);

  const infoItems = [
    { icon: <Landmark className="h-4 w-4 text-primary" />, label: "Titre foncier", value: asset.land_title },
    { icon: <User className="h-4 w-4 text-primary" />, label: "Titulaire", value: asset.asset_holders?.full_name, sub: asset.asset_holders?.phone },
    { icon: <Briefcase className="h-4 w-4 text-primary" />, label: "Cabinet traitant", value: asset.handling_firm },
  ];

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-6 pb-3 hover:bg-muted/30 rounded-t-lg transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Informations foncières</h2>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {infoItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-medium text-sm text-card-foreground truncate">{item.value || "—"}</p>
                    {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
            {asset.description && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-card-foreground">{asset.description}</p>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
