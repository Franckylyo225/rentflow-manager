import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, FileText, UserPlus, Download, Eye, X, MapPin, Image, File, FileSpreadsheet, FileType, Tag, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RecordSaleDialog } from "@/components/patrimoine/RecordSaleDialog";

const DOC_TYPES = [
  { value: "acd", label: "ACD" },
  { value: "cmpf", label: "CMPF" },
  { value: "extrait_topographique", label: "Extrait Topographique" },
  { value: "titre_foncier", label: "Titre Foncier" },
  { value: "permis_construire", label: "Permis de Construire" },
  { value: "ordre_recette", label: "Ordre de recette" },
  { value: "autre", label: "Autre" },
];

function DocThumbnail({ fileUrl, name }: { fileUrl: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("patrimony-docs").createSignedUrl(fileUrl, 3600).then(({ data }) => {
      if (data?.signedUrl) setSrc(data.signedUrl);
    });
  }, [fileUrl]);
  if (!src) return <Image className="h-10 w-10 text-muted-foreground/50" />;
  return <img src={src} alt={name} className="absolute inset-0 w-full h-full object-cover" />;
}

function PatrimoineMapDialog({ latitude, longitude, title, open, onOpenChange }: { latitude: number; longitude: number; title: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const delta = 0.01;
  const bbox = `${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Localisation — {title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 space-y-3">
          <iframe
            src={mapUrl}
            title={`Carte de ${title}`}
            loading="lazy"
            className="h-[450px] w-full rounded-lg border border-border"
          />
          <p className="text-xs text-muted-foreground">Coordonnées : {latitude}, {longitude}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PatrimoineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [deletingContact, setDeletingContact] = useState<any>(null);
  const [deletingDoc, setDeletingDoc] = useState<any>(null);
  const [contactForm, setContactForm] = useState({ full_name: "", phone: "", role: "", email: "" });
  const [docForm, setDocForm] = useState({ name: "", document_type: "autre" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [saleDeedUrl, setSaleDeedUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [assetRes, contactsRes, docsRes] = await Promise.all([
      supabase.from("patrimony_assets").select("*, asset_holders(full_name, phone, email)").eq("id", id).single(),
      supabase.from("patrimony_contacts").select("*").eq("asset_id", id).order("created_at"),
      supabase.from("patrimony_documents").select("*").eq("asset_id", id).order("uploaded_at", { ascending: false }),
    ]);
    setAsset(assetRes.data);
    setContacts(contactsRes.data || []);
    setDocuments(docsRes.data || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load signed URL for sale deed if asset is sold
  useEffect(() => {
    if (asset?.sale_deed_url) {
      supabase.storage.from("patrimony-sales").createSignedUrl(asset.sale_deed_url, 3600).then(({ data }) => {
        if (data?.signedUrl) setSaleDeedUrl(data.signedUrl);
      });
    } else {
      setSaleDeedUrl(null);
    }
  }, [asset?.sale_deed_url]);

  const handleAddContact = async () => {
    if (!contactForm.full_name || !id) return;
    setSaving(true);
    const { error } = await supabase.from("patrimony_contacts").insert({ ...contactForm, asset_id: id });
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Personne ressource ajoutée"); setShowAddContact(false); setContactForm({ full_name: "", phone: "", role: "", email: "" }); fetchData(); }
  };

  const handleDeleteContact = async () => {
    if (!deletingContact) return;
    const { error } = await supabase.from("patrimony_contacts").delete().eq("id", deletingContact.id);
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Supprimé"); setDeletingContact(null); fetchData(); }
  };

  const handleUploadDoc = async () => {
    if (!docFile || !docForm.name || !id) return;
    setUploading(true);
    const fileExt = docFile.name.split(".").pop();
    const filePath = `${id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("patrimony-docs").upload(filePath, docFile);
    if (uploadError) { toast.error("Erreur upload : " + uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("patrimony-docs").getPublicUrl(filePath);
    const { error } = await supabase.from("patrimony_documents").insert({
      asset_id: id,
      name: docForm.name,
      document_type: docForm.document_type,
      file_url: filePath,
      file_size: docFile.size,
    });
    setUploading(false);
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Document ajouté"); setShowAddDoc(false); setDocForm({ name: "", document_type: "autre" }); setDocFile(null); fetchData(); }
  };

  const handleDeleteDoc = async () => {
    if (!deletingDoc) return;
    await supabase.storage.from("patrimony-docs").remove([deletingDoc.file_url]);
    const { error } = await supabase.from("patrimony_documents").delete().eq("id", deletingDoc.id);
    if (error) { toast.error("Erreur : " + error.message); }
    else { toast.success("Document supprimé"); setDeletingDoc(null); fetchData(); }
  };

  const previewDoc = async (doc: any) => {
    const isPdf = /\.pdf$/i.test(doc.file_url) || /\.pdf$/i.test(doc.name);
    if (isPdf) {
      // PDFs are blocked by Chrome in blob iframes — use signed URL in new tab
      const { data, error } = await supabase.storage.from("patrimony-docs").createSignedUrl(doc.file_url, 3600);
      if (error || !data?.signedUrl) { toast.error("Erreur visualisation"); return; }
      window.open(data.signedUrl, "_blank");
      return;
    }
    // Images: show in dialog
    const { data, error } = await supabase.storage.from("patrimony-docs").download(doc.file_url);
    if (error || !data) { toast.error("Erreur visualisation"); return; }
    const url = URL.createObjectURL(data);
    setPreviewUrl(url);
    setPreviewName(doc.name);
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName("");
  };

  const downloadDoc = async (doc: any) => {
    const { data, error } = await supabase.storage.from("patrimony-docs").download(doc.file_url);
    if (error || !data) { toast.error("Erreur téléchargement"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!asset) return <AppLayout><div className="text-center py-20 text-muted-foreground">Actif introuvable.</div></AppLayout>;

  const typeLabel = { terrain: "Terrain", maison: "Maison", titre: "Titre de propriété", autre: "Autre" }[asset.asset_type as string] || asset.asset_type;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patrimoine")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{asset.title}</h1>
              <Badge variant="outline">{typeLabel}</Badge>
              {asset.status === "sold" && (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Vendu
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{asset.locality}{asset.subdivision_name ? ` · ${asset.subdivision_name}` : ""}</p>
          </div>
          {asset.status !== "sold" && (
            <Button className="gap-2" onClick={() => setShowSaleDialog(true)}>
              <Tag className="h-4 w-4" /> Vendre le bien
            </Button>
          )}
        </div>

        {/* Sale info banner */}
        {asset.status === "sold" && (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-600" />
                Bien vendu — crédité au CA du {asset.sale_date ? new Date(asset.sale_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Prix de vente</p>
                <p className="font-semibold text-card-foreground">{(asset.sale_price || 0).toLocaleString()} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commission</p>
                <p className="font-medium text-card-foreground">{(asset.sale_commission || 0).toLocaleString()} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net crédité</p>
                <p className="font-semibold text-emerald-600">{((asset.sale_price || 0) - (asset.sale_commission || 0)).toLocaleString()} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mode de paiement</p>
                <p className="font-medium text-card-foreground">{asset.sale_payment_method || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Acquéreur</p>
                <p className="font-medium text-card-foreground">{asset.buyer_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notaire</p>
                <p className="font-medium text-card-foreground">{asset.notary_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date de vente</p>
                <p className="font-medium text-card-foreground">{asset.sale_date ? new Date(asset.sale_date).toLocaleDateString("fr-FR") : "—"}</p>
              </div>
              {saleDeedUrl && (
                <div className="flex items-end">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(saleDeedUrl, "_blank")}>
                    <FileText className="h-3.5 w-3.5" /> Acte de vente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Titre foncier</p>
                <p className="font-medium text-card-foreground">{asset.land_title || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lotissement</p>
                <p className="font-medium text-card-foreground">{asset.locality || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">N° Ordre de recette</p>
                <p className="font-medium text-card-foreground">{asset.receipt_order_number || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date création du titre</p>
                <p className="font-medium text-card-foreground">{asset.title_creation_date ? new Date(asset.title_creation_date).toLocaleDateString("fr-FR") : "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Titulaire</p>
                <p className="font-medium text-card-foreground">{asset.asset_holders?.full_name || "—"}</p>
                {asset.asset_holders?.phone && <p className="text-xs text-muted-foreground">{asset.asset_holders.phone}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cabinet traitant</p>
                <p className="font-medium text-card-foreground">{asset.handling_firm || "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden relative group cursor-pointer" onClick={() => asset.latitude && asset.longitude && setShowMapDialog(true)}>
            {asset.latitude && asset.longitude ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity"
                  style={{
                    backgroundImage: `url(https://tile.openstreetmap.org/${Math.floor(10)}/${Math.floor((asset.longitude + 180) / 360 * Math.pow(2, 10))}/${Math.floor((1 - Math.log(Math.tan(asset.latitude * Math.PI / 180) + 1 / Math.cos(asset.latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, 10))}.png)`,
                  }}
                />
                <CardContent className="pt-6 flex flex-col items-center justify-center h-full relative z-10 min-h-[120px]">
                  <MapPin className="h-8 w-8 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">
                    {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
                  </p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={(e) => { e.stopPropagation(); setShowMapDialog(true); }}>
                    <MapPin className="h-3.5 w-3.5" /> Afficher la localisation
                  </Button>
                </CardContent>
              </>
            ) : (
              <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[120px] text-muted-foreground">
                <MapPin className="h-6 w-6 opacity-40 mb-2" />
                <p className="text-xs">Aucune géolocalisation</p>
              </CardContent>
            )}
          </Card>
        </div>

        {asset.description && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-card-foreground">{asset.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Map dialog */}
        {asset.latitude && asset.longitude && (
          <PatrimoineMapDialog latitude={asset.latitude} longitude={asset.longitude} title={asset.title} open={showMapDialog} onOpenChange={setShowMapDialog} />
        )}

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Documents ({documents.length})</CardTitle>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddDoc(true)}>
              <Upload className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <FileText className="h-10 w-10 opacity-30 mb-3" />
                <p className="text-sm">Aucun document ajouté.</p>
                <p className="text-xs mt-1">Cliquez sur "Ajouter" pour uploader un fichier.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {documents.map(doc => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url) || /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name);
                  const isPdf = /\.pdf$/i.test(doc.file_url) || /\.pdf$/i.test(doc.name);
                  const typeColor = {
                    acd: "bg-emerald-500/10 text-emerald-600",
                    cnpf: "bg-blue-500/10 text-blue-600",
                    extrait_topographique: "bg-amber-500/10 text-amber-600",
                    titre_foncier: "bg-purple-500/10 text-purple-600",
                    permis_construire: "bg-cyan-500/10 text-cyan-600",
                    ordre_recette: "bg-orange-500/10 text-orange-600",
                    autre: "bg-muted text-muted-foreground",
                  }[doc.document_type] || "bg-muted text-muted-foreground";

                  const DocIcon = isPdf ? FileType : isImage ? Image : FileText;

                  return (
                    <div key={doc.id} className="group relative rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-all duration-200">
                      {/* Thumbnail area */}
                      <div
                        className="relative h-28 bg-muted/40 flex items-center justify-center cursor-pointer"
                        onClick={() => previewDoc(doc)}
                      >
                        {isImage ? (
                          <DocThumbnail fileUrl={doc.file_url} name={doc.name} />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <DocIcon className="h-10 w-10 text-muted-foreground/50" />
                            <span className="text-[10px] uppercase font-medium text-muted-foreground/60 tracking-wider">
                              {isPdf ? "PDF" : doc.file_url.split(".").pop()?.toUpperCase() || "DOC"}
                            </span>
                          </div>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      {/* Info area */}
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-card-foreground truncate" title={doc.name}>{doc.name}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typeColor}`}>
                            {DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                          </span>
                          {doc.file_size && (
                            <span className="text-[10px] text-muted-foreground">{(doc.file_size / 1024).toFixed(0)} Ko</span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 mt-2 justify-end">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => previewDoc(doc)} title="Aperçu">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadDoc(doc)} title="Télécharger">
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeletingDoc(doc)} title="Supprimer">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Personnes ressources</CardTitle>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddContact(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune personne ressource.</p>
            ) : (
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <p className="font-medium text-sm text-card-foreground">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.role}{c.phone ? ` · ${c.phone}` : ""}{c.email ? ` · ${c.email}` : ""}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingContact(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add contact */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Ajouter une personne ressource</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input value={contactForm.full_name} onChange={e => setContactForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nom et prénom" />
            </div>
            <div className="space-y-2">
              <Label>Rôle / Fonction</Label>
              <Input value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} placeholder="Ex: Géomètre, Notaire..." />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 07 00 00 00" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContact(false)}>Annuler</Button>
            <Button onClick={handleAddContact} disabled={saving || !contactForm.full_name}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add document */}
      <Dialog open={showAddDoc} onOpenChange={setShowAddDoc}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Ajouter un document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={docForm.document_type} onValueChange={v => setDocForm(f => ({ ...f, document_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom du document</Label>
              <Input value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: ACD Terrain Cocody" />
            </div>
            <div className="space-y-2">
              <Label>Fichier</Label>
              <Input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDoc(false)}>Annuler</Button>
            <Button onClick={handleUploadDoc} disabled={uploading || !docForm.name || !docFile}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Uploader
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete contact confirm */}
      <AlertDialog open={!!deletingContact} onOpenChange={v => !v && setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette personne ?</AlertDialogTitle>
            <AlertDialogDescription>« {deletingContact?.full_name} » sera supprimé de la liste.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete doc confirm */}
      <AlertDialog open={!!deletingDoc} onOpenChange={v => !v && setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>Le document « {deletingDoc?.name} » sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDoc} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>

      {/* Document preview */}
      <Dialog open={!!previewUrl} onOpenChange={v => !v && closePreview()}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            {previewUrl && (
              <img src={previewUrl} alt={previewName} className="max-w-full h-auto mx-auto rounded" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Record sale */}
      <RecordSaleDialog
        open={showSaleDialog}
        onOpenChange={setShowSaleDialog}
        asset={asset ? { id: asset.id, title: asset.title, organization_id: asset.organization_id } : null}
        onSuccess={fetchData}
      />
    </AppLayout>
  );
}
