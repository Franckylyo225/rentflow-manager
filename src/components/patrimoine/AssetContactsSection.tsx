import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, UserPlus, Users, Trash2, Phone, Mail, Clock } from "lucide-react";
import { useState } from "react";

interface AssetContactsSectionProps {
  contacts: any[];
  onAdd: () => void;
  onDelete: (contact: any) => void;
}

export function AssetContactsSection({ contacts, onAdd, onDelete }: AssetContactsSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-6 pb-3 hover:bg-muted/30 rounded-t-lg transition-colors">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Personnes ressources</h2>
            <Badge variant="secondary" className="ml-1 text-xs">{contacts.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
            >
              <UserPlus className="h-3 w-3" /> Ajouter
            </Button>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2 pb-6">
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune personne ressource</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map(c => {
                  const addedDate = c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0 mt-0.5">
                          {c.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-card-foreground">{c.full_name}</p>
                          {c.role && <p className="text-xs text-muted-foreground mb-1">{c.role}</p>}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {c.phone && (
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                            )}
                            {c.email && (
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                            )}
                            {addedDate && (
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{addedDate}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive opacity-60 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDelete(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
