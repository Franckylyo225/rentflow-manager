import jsPDF from "jspdf";

export interface AmortizationRow {
  month: number;
  date: string;
  monthlyRevenue: number;
  cumulativeRevenue: number;
  remaining: number;
}

export interface PropertyReportData {
  propertyName: string;
  propertyAddress: string;
  cityName?: string;
  acquisitionCost: number;
  notaryFees: number;
  totalCost: number;
  acquisitionDate?: string;
  totalUnits: number;
  occupiedUnits: number;
  monthlyRevenuePotential: number;
  monthlyRevenueActual: number;
  totalCollected: number;
  profitability: number; // percentage of cost recovered
  monthsToBreakEven: number | null;
  breakEvenDate: string | null;
  amortizationPlan: AmortizationRow[];
  organizationName?: string;
}

const fmt = (n: number) =>
  Math.round(n).toLocaleString("fr-FR").replace(/[\u00A0\u202F\u2009]/g, " ");

const safe = (s: string) => (s || "").replace(/[\u00A0\u202F\u2009]/g, " ");

export function generatePropertyReport(data: PropertyReportData) {
  const doc = new jsPDF();
  const marginLeft = 20;
  const pageWidth = 210;
  let y = 20;

  // Header
  doc.setFillColor(16, 122, 87);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RAPPORT DE RENTABILITE", marginLeft, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(safe(data.organizationName || "SCI Binieba"), marginLeft, 26);
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Edite le ${today}`, pageWidth - marginLeft, 26, { align: "right" });

  y = 48;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(safe(data.propertyName), marginLeft, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(safe(`${data.cityName ? data.cityName + " · " : ""}${data.propertyAddress}`), marginLeft, y);
  y += 10;

  // Section 1 - Cost
  doc.setFillColor(245, 247, 250);
  doc.rect(marginLeft, y, pageWidth - 2 * marginLeft, 38, "F");
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cout d'acquisition", marginLeft + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Prix d'achat : ${fmt(data.acquisitionCost)} FCFA`, marginLeft + 5, y + 16);
  doc.text(`Frais notaire & charges : ${fmt(data.notaryFees)} FCFA`, marginLeft + 5, y + 23);
  if (data.acquisitionDate) {
    const d = new Date(data.acquisitionDate).toLocaleDateString("fr-FR");
    doc.text(`Date d'acquisition : ${d}`, marginLeft + 5, y + 30);
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 122, 87);
  doc.text(`Total : ${fmt(data.totalCost)} FCFA`, pageWidth - marginLeft - 5, y + 16, { align: "right" });
  y += 46;

  // Section 2 - Performance
  doc.setFillColor(245, 247, 250);
  doc.rect(marginLeft, y, pageWidth - 2 * marginLeft, 50, "F");
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Performance locative", marginLeft + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Unites : ${data.occupiedUnits} occupees / ${data.totalUnits}`, marginLeft + 5, y + 16);
  doc.text(`Revenu mensuel actuel : ${fmt(data.monthlyRevenueActual)} FCFA`, marginLeft + 5, y + 23);
  doc.text(`Revenu mensuel potentiel : ${fmt(data.monthlyRevenuePotential)} FCFA`, marginLeft + 5, y + 30);
  doc.text(`Total loyers percus a ce jour : ${fmt(data.totalCollected)} FCFA`, marginLeft + 5, y + 37);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 122, 87);
  doc.text(`Rentabilite : ${data.profitability.toFixed(1)} %`, pageWidth - marginLeft - 5, y + 23, { align: "right" });
  y += 58;

  // Section 3 - Break-even
  doc.setFillColor(255, 247, 230);
  doc.rect(marginLeft, y, pageWidth - 2 * marginLeft, 28, "F");
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Date de rentabilite (projection)", marginLeft + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (data.monthsToBreakEven === 0) {
    doc.text("Le bien est deja rentabilise.", marginLeft + 5, y + 17);
  } else if (data.monthsToBreakEven && data.breakEvenDate) {
    const years = Math.floor(data.monthsToBreakEven / 12);
    const months = data.monthsToBreakEven % 12;
    doc.text(
      `Duree restante : ${years} an(s) ${months} mois — Date estimee : ${data.breakEvenDate}`,
      marginLeft + 5,
      y + 17,
    );
  } else {
    doc.text("Projection impossible (aucun revenu locatif).", marginLeft + 5, y + 17);
  }
  y += 36;

  // Section 4 - Amortization plan (table)
  if (data.amortizationPlan.length > 0) {
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Plan d'amortissement (annuel)", marginLeft, y);
    y += 6;

    const colX = [marginLeft, marginLeft + 25, marginLeft + 70, marginLeft + 120, marginLeft + 165];
    doc.setFillColor(16, 122, 87);
    doc.rect(marginLeft, y, pageWidth - 2 * marginLeft, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Annee", colX[0] + 2, y + 5);
    doc.text("Date", colX[1] + 2, y + 5);
    doc.text("Cumul percu", colX[2] + 2, y + 5);
    doc.text("Restant", colX[3] + 2, y + 5);
    doc.text("%", colX[4] + 2, y + 5);
    y += 7;

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");

    // Show yearly milestones (every 12th month) + first/last
    const yearly = data.amortizationPlan.filter((r, i) => r.month % 12 === 0 || i === data.amortizationPlan.length - 1);
    yearly.forEach((row, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginLeft, y, pageWidth - 2 * marginLeft, 6, "F");
      }
      const pct = Math.min(100, (row.cumulativeRevenue / data.totalCost) * 100);
      doc.text(String(Math.ceil(row.month / 12)), colX[0] + 2, y + 4);
      doc.text(safe(row.date), colX[1] + 2, y + 4);
      doc.text(`${fmt(row.cumulativeRevenue)}`, colX[2] + 2, y + 4);
      doc.text(`${fmt(Math.max(0, row.remaining))}`, colX[3] + 2, y + 4);
      doc.text(`${pct.toFixed(0)}%`, colX[4] + 2, y + 4);
      y += 6;
    });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  doc.save(`rapport-${data.propertyName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.pdf`);
}

export function computeProfitability(params: {
  totalCost: number;
  totalCollected: number;
  monthlyRevenueActual: number;
  acquisitionDate?: string;
}): {
  profitability: number;
  monthsToBreakEven: number | null;
  breakEvenDate: string | null;
  amortizationPlan: AmortizationRow[];
} {
  const { totalCost, totalCollected, monthlyRevenueActual, acquisitionDate } = params;
  const profitability = totalCost > 0 ? (totalCollected / totalCost) * 100 : 0;

  if (totalCost <= totalCollected) {
    return { profitability, monthsToBreakEven: 0, breakEvenDate: "Atteint", amortizationPlan: [] };
  }

  if (monthlyRevenueActual <= 0 || totalCost <= 0) {
    return { profitability, monthsToBreakEven: null, breakEvenDate: null, amortizationPlan: [] };
  }

  const remaining = totalCost - totalCollected;
  const monthsToBreakEven = Math.ceil(remaining / monthlyRevenueActual);

  const startDate = acquisitionDate ? new Date(acquisitionDate) : new Date();
  const breakEvenDateObj = new Date(startDate);
  // Project from today forward
  const today = new Date();
  const projectionStart = today > startDate ? today : startDate;
  const projDate = new Date(projectionStart);
  projDate.setMonth(projDate.getMonth() + monthsToBreakEven);
  const breakEvenDate = projDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // Generate plan from projection start (month 1 = next month)
  const plan: AmortizationRow[] = [];
  let cumulative = totalCollected;
  for (let m = 1; m <= Math.min(monthsToBreakEven, 360); m++) {
    cumulative += monthlyRevenueActual;
    const d = new Date(projectionStart);
    d.setMonth(d.getMonth() + m);
    plan.push({
      month: m,
      date: d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      monthlyRevenue: monthlyRevenueActual,
      cumulativeRevenue: cumulative,
      remaining: totalCost - cumulative,
    });
  }

  return { profitability, monthsToBreakEven, breakEvenDate, amortizationPlan: plan };
}
