import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Loader2, Check, AlertTriangle, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

const EXPECTED_COLUMNS = [
  { key: "title", label: "Titre", required: true },
  { key: "asset_type", label: "Type (terrain/maison/titre/autre)", required: false },
  { key: "locality", label: "Lotissement", required: false },
  { key: "subdivision_name", label: "Nom du lotissement", required: false },
  { key: "land_title", label: "Titre foncier", required: false },
  { key: "handling_firm", label: "Cabinet traitant", required: false },
  { key: "receipt_order_number", label: "N° Ordre de recette", required: false },
  { key: "map_link", label: "Lien Google Maps", required: false },
  { key: "description", label: "Description", required: false },
];

const COLUMN_MAP: Record<string, string> = {
  titre: "title",
  nom: "title",
  "nom de l'actif": "title",
  type: "asset_type",
  "type d'actif": "asset_type",
  lotissement: "locality",
  localité: "locality",
  localite: "locality",
  "nom du lotissement": "subdivision_name",
  "titre foncier": "land_title",
  "cabinet traitant": "handling_firm",
  cabinet: "handling_firm",
  "n° ordre de recette": "receipt_order_number",
  "ordre de recette": "receipt_order_number",
  "lien google maps": "map_link",
  "google maps": "map_link",
  "lien carte": "map_link",
  description: "description",
  notes: "description",
};

const VALID_TYPES = ["terrain", "maison", "titre", "autre"];

interface DuplicateInfo {
  source: "db" | "file";
  field: "title" | "land_title";
  value: string;
  matchedWith?: string; // for file dups: row number; for db: existing title in DB
}

interface ParsedRow {
  title: string;
  asset_type: string;
  locality: string;
  subdivision_name: string;
  land_title: string;
  handling_firm: string;
  receipt_order_number: string;
  map_link: string;
  description: string;
  _error?: string;
  _duplicate?: DuplicateInfo;
}

interface PatrimoineExcelImportProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  onSuccess: () => void;
}

export function PatrimoineExcelImport({ open, onOpenChange, organizationId, onSuccess }: PatrimoineExcelImportProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setFileName("");
    setStep("upload");
  };

  const resolveColumn = (header: string): string | null => {
    const normalized = header.trim().toLowerCase();
    if (COLUMN_MAP[normalized]) return COLUMN_MAP[normalized];
    // Direct key match
    const direct = EXPECTED_COLUMNS.find(c => c.key === normalized);
    if (direct) return direct.key;
    return null;
  };

  const normalizeType = (val: string): string => {
    const lower = val.trim().toLowerCase();
    if (VALID_TYPES.includes(lower)) return lower;
    if (lower.includes("terrain")) return "terrain";
    if (lower.includes("maison") || lower.includes("villa") || lower.includes("immeuble")) return "maison";
    if (lower.includes("titre") || lower.includes("propriété")) return "titre";
    return "terrain";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

        if (json.length === 0) {
          toast.error("Le fichier est vide");
          return;
        }

        // Map headers
        const headers = Object.keys(json[0]);
        const mapping: Record<string, string> = {};
        headers.forEach(h => {
          const key = resolveColumn(h);
          if (key) mapping[h] = key;
        });

        if (!Object.values(mapping).includes("title")) {
          toast.error("Colonne 'Titre' introuvable. Vérifiez que votre fichier contient une colonne Titre ou Nom.");
          return;
        }

        // Fetch existing assets to check duplicates against DB
        const { data: existingAssets } = await supabase
          .from("patrimony_assets")
          .select("title, land_title")
          .eq("organization_id", organizationId);

        // Build maps from existing DB to retrieve original casing for display
        const existingTitleMap = new Map<string, string>();
        const existingLandMap = new Map<string, string>();
        (existingAssets || []).forEach(a => {
          const t = (a.title || "").trim();
          const lt = (a.land_title || "").trim();
          if (t) existingTitleMap.set(t.toLowerCase(), t);
          if (lt) existingLandMap.set(lt.toLowerCase(), lt);
        });

        // Track duplicates within the file (key -> first row number where seen)
        const seenTitles = new Map<string, number>();
        const seenLandTitles = new Map<string, number>();

        const parsed: ParsedRow[] = json.map((row, idx) => {
          const rowNumber = idx + 1;
          const mapped: any = {
            title: "",
            asset_type: "terrain",
            locality: "",
            subdivision_name: "",
            land_title: "",
            handling_firm: "",
            receipt_order_number: "",
            map_link: "",
            description: "",
          };
          for (const [header, key] of Object.entries(mapping)) {
            const val = String(row[header] ?? "").trim();
            if (key === "asset_type") {
              mapped[key] = normalizeType(val);
            } else {
              mapped[key] = val;
            }
          }
          if (!mapped.title) {
            mapped._error = "Titre manquant";
            return mapped as ParsedRow;
          }

          const titleKey = mapped.title.toLowerCase();
          const landKey = (mapped.land_title || "").toLowerCase();

          if (existingTitleMap.has(titleKey)) {
            mapped._error = "Doublon (existe déjà)";
            mapped._duplicate = { source: "db", field: "title", value: mapped.title, matchedWith: existingTitleMap.get(titleKey) };
          } else if (landKey && existingLandMap.has(landKey)) {
            mapped._error = "Titre foncier déjà existant";
            mapped._duplicate = { source: "db", field: "land_title", value: mapped.land_title, matchedWith: existingLandMap.get(landKey) };
          } else if (seenTitles.has(titleKey)) {
            mapped._error = "Doublon dans le fichier";
            mapped._duplicate = { source: "file", field: "title", value: mapped.title, matchedWith: `Ligne ${seenTitles.get(titleKey)}` };
          } else if (landKey && seenLandTitles.has(landKey)) {
            mapped._error = "Titre foncier dupliqué dans le fichier";
            mapped._duplicate = { source: "file", field: "land_title", value: mapped.land_title, matchedWith: `Ligne ${seenLandTitles.get(landKey)}` };
          } else {
            seenTitles.set(titleKey, rowNumber);
            if (landKey) seenLandTitles.set(landKey, rowNumber);
          }
          return mapped as ParsedRow;
        });

        setRows(parsed);
        setStep("preview");
      } catch {
        toast.error("Erreur de lecture du fichier Excel");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  const validRows = rows.filter(r => !r._error);
  const errorRows = rows.filter(r => r._error);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);

    const inserts = validRows.map(r => ({
      title: r.title,
      asset_type: r.asset_type,
      locality: r.locality,
      subdivision_name: r.subdivision_name,
      land_title: r.land_title,
      handling_firm: r.handling_firm || null,
      receipt_order_number: r.receipt_order_number || null,
      map_link: r.map_link || null,
      description: r.description || null,
      organization_id: organizationId,
    }));

    const { error } = await supabase.from("patrimony_assets").insert(inserts);
    setImporting(false);

    if (error) {
      toast.error("Erreur d'import : " + error.message);
    } else {
      toast.success(`${validRows.length} actif${validRows.length > 1 ? "s" : ""} importé${validRows.length > 1 ? "s" : ""}`);
      onSuccess();
      onOpenChange(false);
      reset();
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      EXPECTED_COLUMNS.map(c => c.label),
      ["Terrain Cocody", "terrain", "Cocody, Abidjan", "Lot 45, Ilot 12", "TF 12345", "Cabinet Me Koné", "OR-2024-001", "", "Terrain constructible"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modèle");
    // Set column widths
    ws["!cols"] = EXPECTED_COLUMNS.map(() => ({ wch: 22 }));
    XLSX.writeFile(wb, "modele_patrimoine.xlsx");
  };

  const TYPE_LABELS: Record<string, string> = { terrain: "Terrain", maison: "Maison", titre: "Titre", autre: "Autre" };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer des actifs depuis Excel
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Glissez un fichier Excel ici ou cliquez pour sélectionner</p>
                <p className="text-xs text-muted-foreground mt-1">Formats acceptés : .xlsx, .xls, .csv</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Choisir un fichier
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-card-foreground">Colonnes attendues :</p>
              <div className="flex flex-wrap gap-1.5">
                {EXPECTED_COLUMNS.map(c => (
                  <Badge key={c.key} variant={c.required ? "default" : "outline"} className="text-xs">
                    {c.label}{c.required ? " *" : ""}
                  </Badge>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs mt-2" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Télécharger le modèle
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 min-h-0 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="gap-1">
                <FileSpreadsheet className="h-3 w-3" /> {fileName}
              </Badge>
              <span className="text-muted-foreground">{rows.length} ligne{rows.length > 1 ? "s" : ""} détectée{rows.length > 1 ? "s" : ""}</span>
            </div>

            {errorRows.length > 0 && (() => {
              const dupCount = errorRows.filter(r => r._error?.toLowerCase().includes("doublon") || r._error?.toLowerCase().includes("foncier")).length;
              const otherCount = errorRows.length - dupCount;
              return (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-medium text-destructive">{errorRows.length} ligne{errorRows.length > 1 ? "s" : ""} ignorée{errorRows.length > 1 ? "s" : ""}</p>
                    {dupCount > 0 && (
                      <p className="text-muted-foreground text-xs flex items-center gap-1.5">
                        <Copy className="h-3 w-3" /> {dupCount} doublon{dupCount > 1 ? "s" : ""} détecté{dupCount > 1 ? "s" : ""} (déjà en base ou répété{dupCount > 1 ? "s" : ""} dans le fichier)
                      </p>
                    )}
                    {otherCount > 0 && (
                      <p className="text-muted-foreground text-xs">{otherCount} ligne{otherCount > 1 ? "s" : ""} sans titre</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const dups = rows
                .map((r, i) => ({ row: r, index: i + 1 }))
                .filter(x => x.row._duplicate);
              if (dups.length === 0) return null;
              const FIELD_LABELS: Record<string, string> = { title: "Titre", land_title: "Titre foncier" };
              return (
                <details className="border border-border rounded-lg bg-card group">
                  <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-card-foreground flex items-center gap-2 hover:bg-muted/40 rounded-lg">
                    <Copy className="h-3.5 w-3.5 text-destructive" />
                    Voir le détail des {dups.length} doublon{dups.length > 1 ? "s" : ""}
                    <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Cliquez pour développer</span>
                  </summary>
                  <div className="border-t border-border max-h-[240px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="py-1.5 px-3 text-left text-muted-foreground font-medium">Ligne</th>
                          <th className="py-1.5 px-3 text-left text-muted-foreground font-medium">Champ</th>
                          <th className="py-1.5 px-3 text-left text-muted-foreground font-medium">Valeur</th>
                          <th className="py-1.5 px-3 text-left text-muted-foreground font-medium">Motif</th>
                          <th className="py-1.5 px-3 text-left text-muted-foreground font-medium">Correspondance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dups.map(({ row, index }) => {
                          const d = row._duplicate!;
                          return (
                            <tr key={index} className="border-b border-border/50 last:border-0">
                              <td className="py-1.5 px-3 text-muted-foreground">{index}</td>
                              <td className="py-1.5 px-3 text-card-foreground">{FIELD_LABELS[d.field]}</td>
                              <td className="py-1.5 px-3 font-medium text-card-foreground truncate max-w-[180px]" title={d.value}>{d.value}</td>
                              <td className="py-1.5 px-3">
                                <Badge variant={d.source === "db" ? "destructive" : "outline"} className="text-[10px]">
                                  {d.source === "db" ? "Déjà en base" : "Répété dans le fichier"}
                                </Badge>
                              </td>
                              <td className="py-1.5 px-3 text-muted-foreground truncate max-w-[200px]" title={d.matchedWith}>
                                {d.source === "db" ? `≈ "${d.matchedWith}"` : d.matchedWith}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })()}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr className="bg-muted border-b border-border">
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium">#</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium">Titre</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium">Type</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium">Lotissement</th>
                      <th className="py-2 px-3 text-left text-muted-foreground font-medium">Titre foncier</th>
                      <th className="py-2 px-3 text-center text-muted-foreground font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={`border-b border-border/50 ${r._error ? "bg-destructive/5" : ""}`}>
                        <td className="py-1.5 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-1.5 px-3 font-medium text-card-foreground">{r.title || "—"}</td>
                        <td className="py-1.5 px-3 text-muted-foreground">{TYPE_LABELS[r.asset_type] || r.asset_type}</td>
                        <td className="py-1.5 px-3 text-muted-foreground">{r.locality || "—"}</td>
                        <td className="py-1.5 px-3 text-muted-foreground">{r.land_title || "—"}</td>
                        <td className="py-1.5 px-3 text-center">
                          {r._error ? (
                            <Badge variant="destructive" className="text-[10px]">{r._error}</Badge>
                          ) : (
                            <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={reset}>Changer de fichier</Button>
            <Button size="sm" disabled={validRows.length === 0 || importing} onClick={handleImport} className="gap-1.5">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer {validRows.length} actif{validRows.length > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
