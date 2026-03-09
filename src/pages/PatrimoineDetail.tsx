import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { AssetHeader } from "@/components/patrimoine/AssetHeader";
import { AssetInfoSection } from "@/components/patrimoine/AssetInfoSection";
import { AssetDocumentsSection, DOC_TYPES } from "@/components/patrimoine/AssetDocumentsSection";
import { AssetContactsSection } from "@/components/patrimoine/AssetContactsSection";

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

  const documentsHaveAcd = documents.some(d => d.document_type === "acd");

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
      const { data, error } = await supabase.storage.from("patrimony-docs").createSignedUrl(doc.file_url, 3600);
      if (error || !data?.signedUrl) { toast.error("Erreur visualisation"); return; }
      window.open(data.signedUrl, "_blank");
      return;
    }
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

  return (
    <AppLayout>
      <div className="space-y-5 max-w-4xl mx-auto">
        <AssetHeader asset={asset} documentsHaveAcd={documentsHaveAcd} />
        <AssetInfoSection asset={asset} />
        <AssetDocumentsSection
          documents={documents}
          onAdd={() => setShowAddDoc(true)}
          onPreview={previewDoc}
          onDownload={downloadDoc}
          onDelete={setDeletingDoc}
        />
        <AssetContactsSection
          contacts={contacts}
          onAdd={() => setShowAddContact(true)}
          onDelete={setDeletingContact}
        />
      </div>

      {/* Add contact dialog */}
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

      {/* Add document dialog */}
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
            {previewUrl && <img src={previewUrl} alt={previewName} className="max-w-full h-auto mx-auto rounded" />}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
