import jsPDF from "jspdf";

export interface QuittanceMonthLine {
  month: string; // YYYY-MM
  amount: number;
  paidAmount: number;
}

export interface QuittanceData {
  quittanceNumber?: string;
  agentName?: string;
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
  // When present, quittance covers multiple months
  monthsBreakdown?: QuittanceMonthLine[];
}

function formatMonthLabelFr(monthKey: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function buildQuittancePDF(data: QuittanceData): jsPDF {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const dueDateFormatted = new Date(data.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const paymentDateFormatted = data.paymentDate
    ? new Date(data.paymentDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : today;

  // Helper to format numbers with regular space as thousand separator (jsPDF doesn't handle nbsp well)
  const formatNumber = (num: number) => num.toLocaleString("fr-FR").replace(/[\u00A0\u202F\u2009]/g, " ");

  const marginLeft = 25;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginLeft * 2;
  const maxTextWidth = contentWidth - 16; // inner padding for boxes
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

  // Date & quittance number aligned right
  y = 25;
  doc.setFontSize(9);
  doc.text(`Fait le ${today}`, pageWidth - marginLeft, y, { align: "right" });
  if (data.quittanceNumber) {
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`N° ${data.quittanceNumber}`, pageWidth - marginLeft, y, { align: "right" });
    doc.setFont("helvetica", "normal");
  }

  y = 55;

  // Title
  const isMulti = !!(data.monthsBreakdown && data.monthsBreakdown.length > 1);
  doc.setFontSize(isMulti ? 16 : 18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 100, 60);
  doc.text(isMulti ? "QUITTANCE DE LOYER — PAIEMENT MULTI-MOIS" : "QUITTANCE DE LOYER", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(0, 150, 80);
  doc.setLineWidth(0.8);
  doc.line(marginLeft + 25, y, pageWidth - marginLeft - 25, y);
  doc.setTextColor(0);
  y += 5;

  // Period
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  if (isMulti) {
    const first = formatMonthLabelFr(data.monthsBreakdown![0].month);
    const last = formatMonthLabelFr(data.monthsBreakdown![data.monthsBreakdown!.length - 1].month);
    doc.text(`Période : ${data.monthsBreakdown!.length} mois — de ${first} à ${last}`, pageWidth / 2, y, { align: "center" });
  } else {
    doc.text(`Période : ${data.month}`, pageWidth / 2, y, { align: "center" });
  }
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
  const logementText = `Logement : ${data.unitName} — ${data.propertyName}`;
  const logementLines = doc.splitTextToSize(logementText, maxTextWidth);
  doc.text(logementLines, marginLeft + 8, y + 16);
  if (data.propertyAddress) {
    doc.text(data.propertyAddress, marginLeft + 8, y + 22);
  }
  y += 38;

  // Payment details box
  if (isMulti) {
    const lines = data.monthsBreakdown!;
    const headerH = 14;
    const rowH = 6;
    const footerLines = 1 + (data.paymentDate ? 1 : 0) + (data.paymentMethod ? 1 : 0);
    const footerH = 6 + footerLines * 6;
    const boxHeight = headerH + lines.length * rowH + footerH + 4;

    doc.setFillColor(240, 248, 255);
    doc.setDrawColor(180, 200, 220);
    doc.roundedRect(marginLeft, y - 5, contentWidth, boxHeight, 3, 3, "FD");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Détails du paiement", marginLeft + 8, y + 2);

    y += 10;
    doc.setFontSize(9);
    doc.text("Mois", marginLeft + 8, y);
    doc.text("Loyer", marginLeft + contentWidth - 60, y, { align: "right" });
    doc.text("Réglé", marginLeft + contentWidth - 8, y, { align: "right" });
    y += 3;
    doc.setDrawColor(200, 210, 220);
    doc.line(marginLeft + 8, y, marginLeft + contentWidth - 8, y);
    y += 3;

    doc.setFont("helvetica", "normal");
    for (const ln of lines) {
      doc.text(formatMonthLabelFr(ln.month), marginLeft + 8, y);
      doc.text(`${formatNumber(ln.amount)} FCFA`, marginLeft + contentWidth - 60, y, { align: "right" });
      doc.text(`${formatNumber(ln.paidAmount)} FCFA`, marginLeft + contentWidth - 8, y, { align: "right" });
      y += rowH;
    }

    y += 2;
    doc.setDrawColor(180, 200, 220);
    doc.line(marginLeft + 8, y, marginLeft + contentWidth - 8, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Total réglé :", marginLeft + 8, y);
    doc.setTextColor(0, 120, 60);
    doc.text(`${formatNumber(data.paidAmount)} FCFA`, marginLeft + contentWidth - 8, y, { align: "right" });
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");

    if (data.paymentDate) {
      y += 6;
      doc.text("Date de paiement :", marginLeft + 8, y);
      doc.text(paymentDateFormatted, marginLeft + contentWidth - 8, y, { align: "right" });
    }
    if (data.paymentMethod) {
      y += 6;
      doc.text("Mode de paiement :", marginLeft + 8, y);
      doc.text(data.paymentMethod, marginLeft + contentWidth - 8, y, { align: "right" });
    }
    y += 20;
  } else {
    let boxLines = 3;
    if (data.paymentDate) boxLines++;
    if (data.paymentMethod) boxLines++;
    const boxHeight = 18 + boxLines * 7;

    doc.setFillColor(240, 248, 255);
    doc.setDrawColor(180, 200, 220);
    doc.roundedRect(marginLeft, y - 5, contentWidth, boxHeight, 3, 3, "FD");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Détails du paiement", marginLeft + 8, y + 2);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text("Loyer mensuel :", marginLeft + 8, y);
    doc.text(`${formatNumber(data.amount)} FCFA`, marginLeft + contentWidth - 8, y, { align: "right" });

    y += 7;
    doc.text("Montant réglé :", marginLeft + 8, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 120, 60);
    doc.text(`${formatNumber(data.paidAmount)} FCFA`, marginLeft + contentWidth - 8, y, { align: "right" });
    doc.setTextColor(0);

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("Échéance :", marginLeft + 8, y);
    doc.text(dueDateFormatted, marginLeft + contentWidth - 8, y, { align: "right" });

    if (data.paymentDate) {
      y += 7;
      doc.text("Date de paiement :", marginLeft + 8, y);
      doc.text(paymentDateFormatted, marginLeft + contentWidth - 8, y, { align: "right" });
    }

    if (data.paymentMethod) {
      y += 7;
      doc.text("Mode de paiement :", marginLeft + 8, y);
      doc.text(data.paymentMethod, marginLeft + contentWidth - 8, y, { align: "right" });
    }

    y += 20;
  }

  // Confirmation text
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const signataire = data.agentName || data.organizationName || "l'agence immobilière";
  const periodPhrase = isMulti
    ? `aux loyers des mois suivants : ${data.monthsBreakdown!.map(l => formatMonthLabelFr(l.month)).join(", ")}`
    : `au loyer du mois de ${data.month}`;
  const confirmParagraph = `Je soussigné(e), ${signataire}, représentant(e) de ${data.organizationName || "l'agence immobilière"}, reconnais avoir reçu de ${data.tenantName} la somme de ${formatNumber(data.paidAmount)} FCFA correspondant ${periodPhrase}, et lui en donne quittance, sous réserve de tous droits.`;

  const wrappedLines = doc.splitTextToSize(confirmParagraph, contentWidth);
  doc.text(wrappedLines, marginLeft, y);
  y += wrappedLines.length * 5 + 15;

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
  doc.save(`quittance-${data.quittanceNumber || data.month}-${data.tenantName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function getQuittanceBlob(data: QuittanceData): Blob {
  const doc = buildQuittancePDF(data);
  return doc.output("blob");
}

export function getQuittanceDataUrl(data: QuittanceData): string {
  const doc = buildQuittancePDF(data);
  return doc.output("datauristring");
}
