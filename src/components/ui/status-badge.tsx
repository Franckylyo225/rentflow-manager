import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type EscalationLevel, escalationStyles } from "@/lib/escalation";

type PaymentStatus = "paid" | "late" | "partial" | "pending";

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-success/10 text-success border-success/20" },
  late: { label: "En retard", className: "bg-destructive/10 text-destructive border-destructive/20" },
  partial: { label: "Partiel", className: "bg-warning/10 text-warning border-warning/20" },
  pending: { label: "En attente", className: "bg-info/10 text-info border-info/20" },
};

const occupancyConfig: Record<string, { label: string; className: string }> = {
  occupied: { label: "Occupé", className: "bg-success/10 text-success border-success/20" },
  vacant: { label: "Vacant", className: "bg-warning/10 text-warning border-warning/20" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = statusConfig[status];
  return <Badge variant="outline" className={cn("font-medium", config.className)}>{config.label}</Badge>;
}

export function OccupancyBadge({ status }: { status: "occupied" | "vacant" }) {
  const config = occupancyConfig[status];
  return <Badge variant="outline" className={cn("font-medium", config.className)}>{config.label}</Badge>;
}

export function EscalationBadge({ level, label }: { level: EscalationLevel; label: string }) {
  if (level === "none") return null;
  const style = escalationStyles[level];
  return <Badge variant="outline" className={cn("font-medium text-xs", style.className)}>{label}</Badge>;
}
