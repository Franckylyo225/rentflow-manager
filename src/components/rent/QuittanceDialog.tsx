import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, MessageCircle, Mail } from "lucide-react";
import { downloadQuittance, getQuittanceDataUrl, getQuittanceBlob, type QuittanceData } from "@/lib/generateQuittance";
import { toast } from "sonner";
import { useState } from "react";

interface QuittanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: QuittanceData | null;
}

export function QuittanceDialog({ open, onOpenChange, data }: QuittanceDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!data) return null;

  const handlePreview = () => {
    const url = getQuittanceDataUrl(data);
    setPreviewUrl(url);
  };

  const handleDownload = () => {
    downloadQuittance(data);
    toast.success("Quittance téléchargée");
  };

  const handleWhatsApp = () => {
    const phone = data.tenantPhone?.replace(/\s+/g, "").replace(/^\+/, "");
    const message = encodeURIComponent(
      `Bonjour ${data.tenantName},\n\nVeuillez trouver ci-joint votre quittance de loyer pour le mois de ${data.month}.\n\nMontant réglé : ${data.paidAmount.toLocaleString()} FCFA\nLogement : ${data.unitName} — ${data.propertyName}\n\nCordialement,\n${data.organizationName || "La Direction"}`
    );
    const url = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, "_blank");
    toast.info("WhatsApp ouvert — joignez le PDF téléchargé à la conversation");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Quittance de loyer — ${data.month}`);
    const body = encodeURIComponent(
      `Bonjour ${data.tenantName},\n\nVeuillez trouver ci-joint votre quittance de loyer pour le mois de ${data.month}.\n\nMontant réglé : ${data.paidAmount.toLocaleString()} FCFA\nLogement : ${data.unitName} — ${data.propertyName}\n\nCordialement,\n${data.organizationName || "La Direction"}`
    );
    const mailto = `mailto:${data.tenantEmail || ""}?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
    toast.info("Client mail ouvert — joignez le PDF téléchargé");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setPreviewUrl(null); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quittance de loyer — {data.month}</DialogTitle>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-muted text-sm">
          <p className="font-medium text-card-foreground">{data.tenantName}</p>
          <p className="text-muted-foreground">{data.unitName} — {data.propertyName}</p>
          <p className="text-muted-foreground">Montant réglé : {data.paidAmount.toLocaleString()} FCFA</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-1.5" />
            Aperçu
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" />
            Télécharger PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} className="text-green-700 border-green-200 hover:bg-green-50">
            <MessageCircle className="h-4 w-4 mr-1.5" />
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={handleEmail}>
            <Mail className="h-4 w-4 mr-1.5" />
            Email
          </Button>
        </div>

        {previewUrl && (
          <iframe
            src={previewUrl}
            className="w-full h-[500px] rounded-lg border border-border mt-2"
            title="Aperçu de la quittance"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
