import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Upload, FileText, Image, File, Eye, Download, Trash2 } from "lucide-react";
import { useState } from "react";

const DOC_TYPES = [
  { value: "acd", label: "ACD" },
  { value: "cnpf", label: "CNPF" },
  { value: "extrait_topographique", label: "Extrait Topographique" },
  { value: "titre_foncier", label: "Titre Foncier" },
  { value: "permis_construire", label: "Permis de Construire" },
  { value: "autre", label: "Autre" },
];

function getDocIcon(fileUrl: string) {
  if (/\.pdf$/i.test(fileUrl)) return <FileText className="h-5 w-5 text-destructive/70" />;
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl)) return <Image className="h-5 w-5 text-info" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

interface AssetDocumentsSectionProps {
  documents: any[];
  onAdd: () => void;
  onPreview: (doc: any) => void;
  onDownload: (doc: any) => void;
  onDelete: (doc: any) => void;
}

export function AssetDocumentsSection({ documents, onAdd, onPreview, onDownload, onDelete }: AssetDocumentsSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-6 pb-3 hover:bg-muted/30 rounded-t-lg transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Documents</h2>
            <Badge variant="secondary" className="ml-1 text-xs">{documents.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
            >
              <Upload className="h-3 w-3" /> Ajouter
            </Button>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2 pb-6">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun document ajouté</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => {
                  const typeLabel = DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type;
                  const uploadDate = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0">{getDocIcon(doc.file_url)}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-card-foreground truncate">{doc.name}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{typeLabel}</Badge>
                            {doc.file_size ? <span>{(doc.file_size / 1024).toFixed(0)} Ko</span> : null}
                            {uploadDate && <span>· {uploadDate}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(doc)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDownload(doc)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(doc)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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

export { DOC_TYPES };
