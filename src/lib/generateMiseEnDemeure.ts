import jsPDF from "jspdf";

interface MiseEnDemeureData {
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  unitName: string;
  propertyName: string;
  propertyAddress: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  daysLate: number;
  organizationName?: string;
}

export function generateMiseEnDemeure(data: MiseEnDemeureData) {
  const doc = new jsPDF();
  const remaining = data.amount - data.paidAmount;
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const dueDateFormatted = new Date(data.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const marginLeft = 25;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginLeft * 2;
  let y = 30;

  // Header
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.organizationName || "L'Agence immobilière", marginLeft, y);
  y += 15;

  // Date
  doc.text(`Fait le ${today}`, pageWidth - marginLeft, y, { align: "right" });
  y += 20;

  // Recipient
  doc.setFont("helvetica", "bold");
  doc.text("À l'attention de :", marginLeft, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(data.tenantName, marginLeft, y);
  y += 5;
  doc.text(`Logement : ${data.unitName} — ${data.propertyName}`, marginLeft, y);
  y += 5;
  if (data.propertyAddress) {
    doc.text(data.propertyAddress, marginLeft, y);
    y += 5;
  }
  y += 10;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("MISE EN DEMEURE DE PAYER", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(marginLeft + 30, y, pageWidth - marginLeft - 30, y);
  y += 15;

  // Body
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(0);

  const lines = [
    `Madame, Monsieur ${data.tenantName},`,
    "",
    `Par la présente, nous vous mettons en demeure de régler dans les plus brefs délais`,
    `le montant de votre loyer impayé.`,
    "",
    `Conformément à votre contrat de bail pour le logement situé au ${data.unitName},`,
    `${data.propertyName}${data.propertyAddress ? ", " + data.propertyAddress : ""}, vous êtes redevable`,
    `de la somme suivante :`,
  ];

  for (const line of lines) {
    if (line === "") { y += 4; continue; }
    doc.text(line, marginLeft, y);
    y += 6;
  }

  y += 5;

  // Amount box
  doc.setFillColor(250, 245, 245);
  doc.setDrawColor(200, 0, 0);
  doc.roundedRect(marginLeft, y - 3, contentWidth, 35, 3, 3, "FD");

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(`Montant total dû :`, marginLeft + 8, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.amount.toLocaleString()} FCFA`, marginLeft + contentWidth - 8, y, { align: "right" });

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Montant déjà réglé :`, marginLeft + 8, y);
  doc.text(`${data.paidAmount.toLocaleString()} FCFA`, marginLeft + contentWidth - 8, y, { align: "right" });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 0, 0);
  doc.text(`Reste à payer :`, marginLeft + 8, y);
  doc.text(`${remaining.toLocaleString()} FCFA`, marginLeft + contentWidth - 8, y, { align: "right" });
  doc.setTextColor(0);

  y += 15;
  doc.setFont("helvetica", "normal");

  const body2 = [
    `Date d'échéance : ${dueDateFormatted}`,
    `Retard constaté : ${data.daysLate} jours`,
    "",
    `Sans régularisation de votre part dans un délai de huit (8) jours à compter`,
    `de la réception de la présente, nous nous réserverons le droit d'engager`,
    `toute procédure judiciaire appropriée pour recouvrer les sommes dues,`,
    `et ce, sans nouveau préavis de notre part.`,
    "",
    `Nous vous invitons à prendre contact avec notre service de gestion dans`,
    `les meilleurs délais afin de trouver une solution amiable à cette situation.`,
    "",
    "",
    `Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`,
  ];

  for (const line of body2) {
    if (line === "") { y += 4; continue; }
    doc.text(line, marginLeft, y);
    y += 6;
  }

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text(data.organizationName || "La Direction", marginLeft, y);

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("Document généré automatiquement — SCI Binieba", pageWidth / 2, 285, { align: "center" });

  doc.save(`mise-en-demeure-${data.tenantName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
