import { type DbRentPayment } from "@/hooks/useData";

export interface TenantRiskScore {
  score: number; // 0-100, 100 = highest risk
  level: "low" | "medium" | "high" | "critical";
  label: string;
  lateCount: number;
  totalPayments: number;
  avgDaysLate: number;
  unpaidAmount: number;
}

export function computeTenantRiskScore(tenantId: string, payments: DbRentPayment[]): TenantRiskScore {
  const tenantPayments = payments.filter(p => p.tenant_id === tenantId);
  if (tenantPayments.length === 0) {
    return { score: 0, level: "low", label: "Nouveau", lateCount: 0, totalPayments: 0, avgDaysLate: 0, unpaidAmount: 0 };
  }

  const now = new Date();
  let lateCount = 0;
  let totalDaysLate = 0;
  let unpaidAmount = 0;

  for (const p of tenantPayments) {
    const due = new Date(p.due_date);
    const daysLate = Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = p.amount - p.paid_amount;

    if (p.status === "late" || p.status === "partial") {
      lateCount++;
      totalDaysLate += daysLate;
      unpaidAmount += remaining;
    } else if (p.status === "pending" && daysLate > 0) {
      lateCount++;
      totalDaysLate += daysLate;
      unpaidAmount += remaining;
    }
  }

  const avgDaysLate = lateCount > 0 ? Math.round(totalDaysLate / lateCount) : 0;
  const lateRatio = tenantPayments.length > 0 ? lateCount / tenantPayments.length : 0;

  // Score: weighted combination
  let score = 0;
  score += Math.min(lateRatio * 40, 40);           // up to 40 pts for late ratio
  score += Math.min(avgDaysLate / 30 * 30, 30);    // up to 30 pts for avg days late
  score += Math.min(unpaidAmount / 1000000 * 20, 20); // up to 20 pts for unpaid amount
  score += Math.min(lateCount * 2.5, 10);           // up to 10 pts for absolute late count
  score = Math.round(Math.min(score, 100));

  let level: TenantRiskScore["level"];
  let label: string;
  if (score <= 20) { level = "low"; label = "Faible"; }
  else if (score <= 45) { level = "medium"; label = "Modéré"; }
  else if (score <= 70) { level = "high"; label = "Élevé"; }
  else { level = "critical"; label = "Critique"; }

  return { score, level, label, lateCount, totalPayments: tenantPayments.length, avgDaysLate, unpaidAmount };
}

export const riskStyles: Record<TenantRiskScore["level"], string> = {
  low: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

export const riskProgressColors: Record<TenantRiskScore["level"], string> = {
  low: "bg-success",
  medium: "bg-warning",
  high: "bg-orange-500",
  critical: "bg-destructive",
};
