import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, Check, AlertTriangle, Download, Copy, UserPlus, UserCheck, UserX, Trash2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

const EXPECTED_COLUMNS = [
  { key: "title", label: "Titre", required: true },
  { key: "asset_type", label: "Type (terrain/maison/titre/autre)", required: false },
  { key: "holder_name", label: "Nom et prénoms (titulaire)", required: false },
  { key: "holder_phone", label: "Téléphone titulaire", required: false },
  { key: "holder_email", label: "Email titulaire", required: false },
  { key: "city_name", label: "Ville", required: false },
  { key: "locality", label: "Lotissement", required: false },
  { key: "block_number", label: "N° Ilot", required: false },
  { key: "plot_number", label: "N° Lot", required: false },
  { key: "land_title", label: "Titre foncier", required: false },
  { key: "handling_firm", label: "Cabinet traitant", required: false },
  { key: "receipt_order_number", label: "N° Ordre de recette", required: false },
  { key: "title_creation_date", label: "Date création", required: false },
  { key: "map_link", label: "Lien Google Maps", required: false },
  { key: "description", label: "État de traitement (Description)", required: false },
];

const COLUMN_MAP: Record<string, string> = {
  titre: "title", nom: "title", "nom de l'actif": "title",
  type: "asset_type", "type d'actif": "asset_type",
  "nom et prenoms": "holder_name", "nom et prénoms": "holder_name",
  "nom et prenoms (titulaire)": "holder_name", "nom et prénoms (titulaire)": "holder_name",
  titulaire: "holder_name", proprietaire: "holder_name", propriétaire: "holder_name",
  "telephone titulaire": "holder_phone", "téléphone titulaire": "holder_phone",
  telephone: "holder_phone", téléphone: "holder_phone", tel: "holder_phone", phone: "holder_phone",
  "email titulaire": "holder_email", email: "holder_email", mail: "holder_email",
  ville: "city_name", city: "city_name",
  lotissement: "locality", localité: "locality", localite: "locality",
  "n° ilot": "block_number", "n ilot": "block_number", ilot: "block_number", "îlot": "block_number", "n° îlot": "block_number",
  "n° lot": "plot_number", "n lot": "plot_number", lot: "plot_number",
  "titre foncier": "land_title", tf: "land_title",
  "cabinet traitant": "handling_firm", cabinet: "handling_firm",
  "n° ordre de recette": "receipt_order_number", "ordre de recette": "receipt_order_number",
  "date creation": "title_creation_date", "date création": "title_creation_date",
  "date de creation": "title_creation_date", "date de création": "title_creation_date",
  "date du titre": "title_creation_date",
  "lien google maps": "map_link", "google maps": "map_link", "lien carte": "map_link",
  description: "description", notes: "description", "etat de traitement": "description", "état de traitement": "description",
};

const VALID_TYPES = ["terrain", "maison", "titre", "autre"];
const TYPE_LABELS: Record<string, string> = { terrain: "Terrain", maison: "Maison", titre: "Titre", autre: "Autre" };

interface DuplicateInfo {
  source: "db" | "file";
  field: "title" | "land_title";
  value: string;
  matchedWith?: string;
}

type HolderMatch =
  | { source: "db"; id: string; matchField: "name" | "phone" }
  | { source: "new" }
  | { source: "none" };

interface ParsedRow {
  title: string;
  asset_type: string;
  holder_name: string;
  holder_phone: string;
  holder_email: string;
  city_name: string;
  city_id: string | null;
  locality: string;
  block_number: string;
  plot_number: string;
  land_title: string;
  handling_firm: string;
  receipt_order_number: string;
  title_creation_date: string; // ISO yyyy-mm-dd or ""
  map_link: string;
  description: string;
  _error?: string;
  _duplicate?: DuplicateInfo;
  _holder: HolderMatch;
}

interface PatrimoineExcelImportProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  onSuccess: () => void;
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const cleanNumber = (s: string) => s.trim().replace(/^(lot|ilot|îlot|n°|n\.?|no\.?)\s*/i, "").trim();

const parseExcelDate = (v: any): string => {
  if (v === null || v === undefined || v === "") return "";
  // Numeric Excel serial
  if (typeof v === "number" && isFinite(v)) {
    const d = XLSX.SSF?.parse_date_code(v);
    if (d) {
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${d.y}-${mm}-${dd}`;
    }
  }
  const s = String(v).trim();
  if (!s) return "";
  // ISO
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // dd/mm/yyyy or dd-mm-yyyy
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let y = m[3];
    if (y.length === 2) y = (parseInt(y) > 50 ? "19" : "20") + y;
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
};

export function PatrimoineExcelImport({ open, onOpenChange, organizationId, onSuccess }: PatrimoineExcelImportProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [existingHolders, setExistingHolders] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [holderFilter, setHolderFilter] = useState<"all" | "db" | "new" | "none">("all");
  const [errorFilter, setErrorFilter] = useState<"all" | "valid" | "error">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setFileName("");
    setStep("upload");
    setSearch("");
    setHolderFilter("all");
    setErrorFilter("all");
  };

  const fuzzy = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const resolveColumn = (header: string): string | null => {
    const normalized = header.trim().toLowerCase();
    if (COLUMN_MAP[normalized]) return COLUMN_MAP[normalized];
    const direct = EXPECTED_COLUMNS.find(c => c.key === normalized);
    if (direct) return direct.key;
    // Fuzzy match : ignore accents, espaces et ponctuation (ex: "N°Ilot", "N° ÎLOT", "Numéro Ilot")
    const f = fuzzy(header);
    if (!f) return null;
    for (const [alias, key] of Object.entries(COLUMN_MAP)) {
      if (fuzzy(alias) === f) return key;
    }
    if (["ilot", "nilot", "noilot", "numeroilot", "numilot"].includes(f)) return "block_number";
    if (["lot", "nlot", "nolot", "numerolot", "numlot"].includes(f)) return "plot_number";
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

  const matchHolder = (
    name: string, phone: string,
    holders: { id: string; full_name: string; phone: string }[],
  ): HolderMatch => {
    const n = normalize(name);
    const p = phone.trim().replace(/\s+/g, "");
    if (!n && !p) return { source: "none" };
    if (n) {
      const byName = holders.find(h => normalize(h.full_name) === n);
      if (byName) return { source: "db", id: byName.id, matchField: "name" };
    }
    if (p) {
      const byPhone = holders.find(h => (h.phone || "").replace(/\s+/g, "") === p);
      if (byPhone) return { source: "db", id: byPhone.id, matchField: "phone" };
    }
    if (n) return { source: "new" };
    return { source: "none" };
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

        if (json.length === 0) {
          toast.error("Le fichier est vide");
          return;
        }

        const headers = Object.keys(json[0]);
        const mapping: Record<string, string> = {};
        headers.forEach(h => { const key = resolveColumn(h); if (key) mapping[h] = key; });

        const hasTitleCol = Object.values(mapping).includes("title");

        // Fetch refs
        const [{ data: existingAssets }, { data: holdersData }, { data: citiesData }] = await Promise.all([
          supabase.from("patrimony_assets").select("title, land_title").eq("organization_id", organizationId),
          supabase.from("asset_holders").select("id, full_name, phone").eq("organization_id", organizationId),
          supabase.from("cities").select("id, name").eq("organization_id", organizationId),
        ]);

        const holders = (holdersData || []) as { id: string; full_name: string; phone: string }[];
        const citiesList = (citiesData || []) as { id: string; name: string }[];
        setExistingHolders(holders);
        setCities(citiesList);

        const existingTitleMap = new Map<string, string>();
        const existingLandMap = new Map<string, string>();
        (existingAssets || []).forEach(a => {
          const t = (a.title || "").trim();
          const lt = (a.land_title || "").trim();
          if (t) existingTitleMap.set(t.toLowerCase(), t);
          if (lt) existingLandMap.set(lt.toLowerCase(), lt);
        });

        const cityByName = new Map(citiesList.map(c => [c.name.toLowerCase().trim(), c.id]));

        const seenTitles = new Map<string, number>();
        const seenLandTitles = new Map<string, number>();

        const parsed: ParsedRow[] = json.map((row, idx) => {
          const rowNumber = idx + 1;
          const m: any = {
            title: "", asset_type: "terrain",
            holder_name: "", holder_phone: "", holder_email: "",
            city_name: "", city_id: null,
            locality: "", block_number: "", plot_number: "",
            land_title: "", handling_firm: "", receipt_order_number: "",
            title_creation_date: "", map_link: "", description: "",
          };
          for (const [header, key] of Object.entries(mapping)) {
            const raw = row[header];
            if (key === "asset_type") m[key] = normalizeType(String(raw ?? ""));
            else if (key === "title_creation_date") m[key] = parseExcelDate(raw);
            else if (key === "block_number" || key === "plot_number") m[key] = cleanNumber(String(raw ?? ""));
            else m[key] = String(raw ?? "").trim();
          }

          if (m.city_name) m.city_id = cityByName.get(m.city_name.toLowerCase().trim()) || null;

          // Auto-générer un titre si absent à partir de Lotissement / Ilot / Lot
          if (!m.title) {
            const parts: string[] = [];
            if (m.locality) parts.push(m.locality);
            const il = m.block_number ? `Ilot ${m.block_number}` : "";
            const lo = m.plot_number ? `Lot ${m.plot_number}` : "";
            const sub = [il, lo].filter(Boolean).join(" / ");
            if (sub) parts.push(sub);
            m.title = parts.join(" – ").trim();
          }

          // Fallback sur N° d'ordre de recette si toujours sans titre
          if (!m.title && m.receipt_order_number) {
            m.title = m.receipt_order_number;
          }

          if (!m.title) { m._error = "Titre manquant (renseignez Lotissement + Ilot/Lot, une colonne Titre, ou N° d'ordre de recette)"; m._holder = { source: "none" }; return m as ParsedRow; }

          const titleKey = m.title.toLowerCase();
          const landKey = (m.land_title || "").toLowerCase();

          if (existingTitleMap.has(titleKey)) {
            m._error = "Doublon (existe déjà)";
            m._duplicate = { source: "db", field: "title", value: m.title, matchedWith: existingTitleMap.get(titleKey) };
          } else if (landKey && existingLandMap.has(landKey)) {
            m._error = "Titre foncier déjà existant";
            m._duplicate = { source: "db", field: "land_title", value: m.land_title, matchedWith: existingLandMap.get(landKey) };
          } else if (seenTitles.has(titleKey)) {
            m._error = "Doublon dans le fichier";
            m._duplicate = { source: "file", field: "title", value: m.title, matchedWith: `Ligne ${seenTitles.get(titleKey)}` };
          } else if (landKey && seenLandTitles.has(landKey)) {
            m._error = "Titre foncier dupliqué dans le fichier";
            m._duplicate = { source: "file", field: "land_title", value: m.land_title, matchedWith: `Ligne ${seenLandTitles.get(landKey)}` };
          } else {
            seenTitles.set(titleKey, rowNumber);
            if (landKey) seenLandTitles.set(landKey, rowNumber);
          }

          m._holder = matchHolder(m.holder_name, m.holder_phone, holders);
          return m as ParsedRow;
        });

        setRows(parsed);
        setStep("preview");
      } catch (err) {
        console.error(err);
        toast.error("Erreur de lecture du fichier Excel");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateRow = (idx: number, patch: Partial<ParsedRow>) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const merged = { ...r, ...patch };
      // Recompute holder match if holder fields changed
      if ("holder_name" in patch || "holder_phone" in patch) {
        merged._holder = matchHolder(merged.holder_name, merged.holder_phone, existingHolders);
      }
      // Resolve city
      if ("city_id" in patch) {
        const c = cities.find(x => x.id === patch.city_id);
        merged.city_name = c?.name || merged.city_name;
      }
      return merged;
    }));
  };

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => {
        if (errorFilter === "valid" && r._error) return false;
        if (errorFilter === "error" && !r._error) return false;
        if (holderFilter !== "all" && r._holder.source !== holderFilter) return false;
        if (q) {
          const hay = `${r.title} ${r.locality} ${r.holder_name} ${r.block_number} ${r.plot_number} ${r.land_title}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [rows, search, holderFilter, errorFilter]);

  const stats = useMemo(() => {
    const valid = rows.filter(r => !r._error).length;
    const errors = rows.length - valid;
    const dbMatched = rows.filter(r => r._holder.source === "db").length;
    const toCreate = rows.filter(r => r._holder.source === "new").length;
    const noHolder = rows.filter(r => r._holder.source === "none").length;
    return { valid, errors, dbMatched, toCreate, noHolder };
  }, [rows]);

  const consolidateHolders = async () => {
    const newNames = new Map<string, { full_name: string; phone: string; email: string }>();
    rows.forEach(r => {
      if (r._holder.source === "new" && r.holder_name.trim()) {
        const key = normalize(r.holder_name);
        if (!newNames.has(key)) {
          newNames.set(key, { full_name: r.holder_name.trim(), phone: r.holder_phone.trim(), email: r.holder_email.trim() });
        }
      }
    });
    if (newNames.size === 0) {
      toast.info("Aucun titulaire à créer.");
      return;
    }
    setConsolidating(true);
    const inserts = Array.from(newNames.values()).map(h => ({ ...h, organization_id: organizationId }));
    const { data: inserted, error } = await supabase.from("asset_holders").insert(inserts).select("id, full_name, phone");
    if (error) {
      setConsolidating(false);
      toast.error("Erreur création titulaires : " + error.message);
      return;
    }
    const updatedHolders = [...existingHolders, ...(inserted || [])];
    setExistingHolders(updatedHolders);
    setRows(prev => prev.map(r => {
      if (r._holder.source !== "new") return r;
      const match = matchHolder(r.holder_name, r.holder_phone, updatedHolders);
      return { ...r, _holder: match };
    }));
    setConsolidating(false);
    toast.success(`${inserted?.length || 0} titulaire(s) créé(s) · ${stats.dbMatched} reconnu(s)`);
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => !r._error);
    if (validRows.length === 0) return;
    const hasUnconsolidated = validRows.some(r => r._holder.source === "new");
    if (hasUnconsolidated) {
      toast.error("Cliquez d'abord sur « Consolider » pour créer les nouveaux titulaires.");
      return;
    }
    setImporting(true);
    const inserts = validRows.map(r => ({
      title: r.title, asset_type: r.asset_type,
      holder_id: r._holder.source === "db" ? r._holder.id : null,
      city_id: r.city_id || null,
      locality: r.locality, subdivision_name: "",
      block_number: r.block_number, plot_number: r.plot_number,
      land_title: r.land_title,
      handling_firm: r.handling_firm || null,
      receipt_order_number: r.receipt_order_number || null,
      title_creation_date: r.title_creation_date || null,
      map_link: r.map_link || null,
      description: r.description || null,
      organization_id: organizationId,
    }));
    const { error } = await supabase.from("patrimony_assets").insert(inserts);
    setImporting(false);
    if (error) toast.error("Erreur d'import : " + error.message);
    else {
      toast.success(`${validRows.length} actif${validRows.length > 1 ? "s" : ""} importé${validRows.length > 1 ? "s" : ""}`);
      onSuccess(); onOpenChange(false); reset();
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      EXPECTED_COLUMNS.map(c => c.label),
      ["Terrain Cocody", "terrain", "Kouassi N'Guessan", "+225 07 00 00 00 00", "kouassi@mail.ci",
       "Abidjan", "Cocody Danga", "12", "45", "TF 12345", "Cabinet Me Koné", "OR-2024-001",
       "15/03/2024", "", "Dossier en attente d'ACD"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modèle");
    ws["!cols"] = EXPECTED_COLUMNS.map(() => ({ wch: 22 }));
    XLSX.writeFile(wb, "modele_patrimoine.xlsx");
  };

  const validCount = stats.valid;
  const toConsolidate = stats.toCreate;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[1100px] max-h-[90vh] flex flex-col">
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
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Choisir un fichier</Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-card-foreground">Colonnes reconnues :</p>
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
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <Badge variant="outline" className="gap-1"><FileSpreadsheet className="h-3 w-3" /> {fileName}</Badge>
              <span className="text-muted-foreground">{rows.length} ligne{rows.length > 1 ? "s" : ""}</span>
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">{stats.valid} valides</Badge>
              {stats.errors > 0 && <Badge variant="destructive">{stats.errors} en erreur</Badge>}
              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30"><UserCheck className="h-3 w-3" /> {stats.dbMatched} reconnus</Badge>
              {stats.toCreate > 0 && <Badge variant="outline" className="gap-1 text-blue-600 border-blue-500/30"><UserPlus className="h-3 w-3" /> {stats.toCreate} à créer</Badge>}
              {stats.noHolder > 0 && <Badge variant="outline" className="gap-1 text-muted-foreground"><UserX className="h-3 w-3" /> {stats.noHolder} sans titulaire</Badge>}
            </div>

            {/* Filtres */}
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="h-8 pl-8 text-xs" placeholder="Rechercher (titre, lotissement, titulaire, ilot, lot)" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={holderFilter} onValueChange={(v: any) => setHolderFilter(v)}>
                <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous titulaires</SelectItem>
                  <SelectItem value="db">Reconnus</SelectItem>
                  <SelectItem value="new">À créer</SelectItem>
                  <SelectItem value="none">Sans titulaire</SelectItem>
                </SelectContent>
              </Select>
              <Select value={errorFilter} onValueChange={(v: any) => setErrorFilter(v)}>
                <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="valid">Valides</SelectItem>
                  <SelectItem value="error">En erreur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-muted border-b border-border">
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium">#</th>
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium min-w-[180px]">Titre *</th>
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium">Type</th>
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium min-w-[160px]">Titulaire</th>
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium min-w-[120px]">Téléphone</th>
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium">Ville</th>
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium">Lotissement</th>
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium w-16">Ilot</th>
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium w-16">Lot</th>
                      <th className="py-2 px-2 text-left text-muted-foreground font-medium">Titre foncier</th>
                      <th className="py-2 px-2 text-center text-muted-foreground font-medium">Statut</th>
                      <th className="py-2 px-2 text-center text-muted-foreground font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map(({ r, i }) => {
                      const hBadge = r._holder.source === "db"
                        ? <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Reconnu</Badge>
                        : r._holder.source === "new"
                        ? <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">À créer</Badge>
                        : <Badge variant="outline" className="text-[10px] text-muted-foreground">—</Badge>;
                      return (
                        <tr key={i} className={`border-b border-border/50 ${r._error ? "bg-destructive/5" : ""}`}>
                          <td className="py-1 px-2 text-muted-foreground align-top pt-2">{i + 1}</td>
                          <td className="py-1 px-1"><Input className="h-7 text-xs" value={r.title} onChange={e => updateRow(i, { title: e.target.value })} /></td>
                          <td className="py-1 px-1">
                            <Select value={r.asset_type} onValueChange={v => updateRow(i, { asset_type: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {VALID_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-xs" value={r.holder_name} onChange={e => updateRow(i, { holder_name: e.target.value })} />
                            <div className="mt-0.5">{hBadge}</div>
                          </td>
                          <td className="py-1 px-1"><Input className="h-7 text-xs" value={r.holder_phone} onChange={e => updateRow(i, { holder_phone: e.target.value })} /></td>
                          <td className="py-1 px-1">
                            <Select value={r.city_id || "none"} onValueChange={v => updateRow(i, { city_id: v === "none" ? null : v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-1 px-1"><Input className="h-7 text-xs" value={r.locality} onChange={e => updateRow(i, { locality: e.target.value })} /></td>
                          <td className="py-1 px-1"><Input className="h-7 text-xs" value={r.block_number} onChange={e => updateRow(i, { block_number: e.target.value })} /></td>
                          <td className="py-1 px-1"><Input className="h-7 text-xs" value={r.plot_number} onChange={e => updateRow(i, { plot_number: e.target.value })} /></td>
                          <td className="py-1 px-1"><Input className="h-7 text-xs" value={r.land_title} onChange={e => updateRow(i, { land_title: e.target.value })} /></td>
                          <td className="py-1 px-2 text-center align-top pt-2">
                            {r._error ? (
                              <Badge variant="destructive" className="text-[10px]" title={r._duplicate?.matchedWith}>{r._error}</Badge>
                            ) : (
                              <Check className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                            )}
                          </td>
                          <td className="py-1 px-2 text-center align-top pt-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRow(i)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRows.length === 0 && (
                      <tr><td colSpan={12} className="py-8 text-center text-muted-foreground text-xs">Aucun résultat pour ces filtres.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {stats.errors > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Les lignes en erreur ne seront pas importées. Corrigez le titre / supprimez les doublons, ou supprimez la ligne.
                </p>
              </div>
            )}
          </div>
        )}

        {step === "preview" && (
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={reset}>Changer de fichier</Button>
            <Button
              variant="secondary" size="sm"
              disabled={consolidating || toConsolidate === 0}
              onClick={consolidateHolders}
              className="gap-1.5"
            >
              {consolidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Consolider {toConsolidate > 0 ? `(${toConsolidate} titulaire${toConsolidate > 1 ? "s" : ""})` : ""}
            </Button>
            <Button
              size="sm"
              disabled={validCount === 0 || importing || toConsolidate > 0}
              onClick={handleImport}
              className="gap-1.5"
              title={toConsolidate > 0 ? "Consolidez d'abord les nouveaux titulaires" : undefined}
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer {validCount} actif{validCount > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
