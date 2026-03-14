import jsPDF from "jspdf";

export interface QuittanceData {
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  propertyAddress: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  month: string;
  paymentDate?: string;
  paymentMethod?: string;
  organizationName?: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
}

function buildQuittancePDF(data: QuittanceData): jsPDF {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const dueDateFormatted = new Date(data.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const marginLeft = 25;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginLeft * 2;
  let y = 25;

  // Header - Organization
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.organizationName || "Agence Immobilière", marginLeft, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  if (data.organizationAddress) { doc.text(data.organizationAddress, marginLeft, y); y += 4; }
  if (data.organizationPhone) { doc.text(`Tél : ${data.organizationPhone}`, marginLeft, y); y += 4; }
  if (data.organizationEmail) { doc.text(data.organizationEmail, marginLeft, y); y += 4; }
  doc.setTextColor(0);

  // Date aligned right
  y = 25;
  doc.setFontSize(9);
  doc.text(`Fait le ${today}`, pageWidth - marginLeft, y, { align: "right" });

  y = 55;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 100, 60);
  doc.text("QUITTANCE DE LOYER", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(0, 150, 80);
  doc.setLineWidth(0.8);
  doc.line(marginLeft + 25, y, pageWidth - marginLeft - 25, y);
  doc.setTextColor(0);
  y += 5;

  // Period
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Période : ${data.month}`, pageWidth / 2, y, { align: "center" });
  y += 15;

  // Tenant info box
  doc.setFillColor(245, 250, 248);
  doc.setDrawColor(200, 220, 210);
  doc.roundedRect(marginLeft, y - 5, contentWidth, 30, 3, 3, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Locataire", marginLeft + 8, y + 2);
  doc.setFont("helvetica", "normal");
  doc.text(data.tenantName, marginLeft + 8, y + 9);
  doc.text(`Logement : ${data.unitName} — ${data.propertyName}`, marginLeft + 8, y + 16);
  if (data.propertyAddress) {
    doc.text(data.propertyAddress, marginLeft + 8, y + 22);
  }
  y += 38;

  // Payment details box
  doc.setFillColor(240, 248, 255);
  doc.setDrawColor(180, 200, 220);
  doc.roundedRect(marginLeft, y - 5, contentWidth, 40, 3, 3, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Détails du paiement", marginLeft + 8, y + 2);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.text("Loyer mensuel :", marginLeft + 8, y);
  doc.text(`${data.amount.toLocaleString()} FCFA`, marginLeft + contentWidth - 8, y, { align: "right" });

  y += 7;
  doc.text("Montant réglé :", marginLeft + 8, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 120, 60);
  doc.text(`${data.paidAmount.toLocaleString()} FCFA`, marginLeft + contentWidth - 8, y, { align: "right" });
  doc.setTextColor(0);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Échéance :", marginLeft + 8, y);
  doc.text(dueDateFormatted, marginLeft + contentWidth - 8, y, { align: "right" });

  if (data.paymentMethod) {
    y += 7;
    doc.text("Mode de paiement :", marginLeft + 8, y);
    doc.text(data.paymentMethod, marginLeft + contentWidth - 8, y, { align: "right" });
  }

  y += 20;

  // Confirmation text
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const confirmText = [
    `Je soussigné(e), représentant(e) de ${data.organizationName || "l'agence immobilière"},`,
    `reconnais avoir reçu de ${data.tenantName} la somme de ${data.paidAmount.toLocaleString()} FCFA`,
    `au titre du loyer du mois de ${data.month}, et lui en donne quittance,`,
    `sous réserve de tous droits.`,
  ];

  for (const line of confirmText) {
    doc.text(line, marginLeft, y);
    y += 7;
  }

  y += 15;

  // Signature
  doc.setFont("helvetica", "bold");
  doc.text("Le bailleur,", marginLeft, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(data.organizationName || "La Direction", marginLeft, y);

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("Cette quittance annule tous les reçus qui auraient pu être établis précédemment.", pageWidth / 2, 275, { align: "center" });
  doc.text("Document généré automatiquement", pageWidth / 2, 280, { align: "center" });

  return doc;
}

export function downloadQuittance(data: QuittanceData) {
  const doc = buildQuittancePDF(data);
  doc.save(`quittance-${data.month}-${data.tenantName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function getQuittanceBlob(data: QuittanceData): Blob {
  const doc = buildQuittancePDF(data);
  return doc.output("blob");
}

export function getQuittanceDataUrl(data: QuittanceData): string {
  const doc = buildQuittancePDF(data);
  return doc.output("datauristring");
}
