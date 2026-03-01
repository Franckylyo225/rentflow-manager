// Escalation level utilities
export type EscalationLevel = "none" | "light" | "moderate" | "critical";

export interface EscalationInfo {
  level: EscalationLevel;
  daysLate: number;
  label: string;
  numericLevel: number; // 0, 1, 2, 3
}

export function getEscalationInfo(dueDate: string, status: string, paidAmount: number, amount: number): EscalationInfo {
  if (status === "paid") return { level: "none", daysLate: 0, label: "Payé", numericLevel: 0 };

  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = now.getTime() - due.getTime();
  const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysLate <= 0) return { level: "none", daysLate: 0, label: "En cours", numericLevel: 0 };
  if (daysLate <= 7) return { level: "light", daysLate, label: "Retard léger", numericLevel: 1 };
  if (daysLate <= 30) return { level: "moderate", daysLate, label: "Retard important", numericLevel: 2 };
  return { level: "critical", daysLate, label: "Impayé critique", numericLevel: 3 };
}

export const escalationStyles: Record<EscalationLevel, { className: string }> = {
  none: { className: "" },
  light: { className: "bg-warning/10 text-warning border-warning/20" },
  moderate: { className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  critical: { className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const defaultTasksByLevel: Record<number, { title: string; description: string }[]> = {
  1: [{ title: "Envoyer rappel cordial", description: "Rappeler au locataire son échéance en retard avec un ton bienveillant." }],
  2: [
    { title: "Appeler le locataire", description: "Contacter le locataire par téléphone pour discuter du retard de paiement." },
    { title: "Envoyer relance ferme", description: "Envoyer une relance écrite avec un ton plus ferme." },
  ],
  3: [
    { title: "Générer mise en demeure", description: "Préparer le document de mise en demeure pour envoi au locataire." },
    { title: "Proposer plan d'apurement", description: "Proposer un échéancier de paiement au locataire." },
    { title: "Évaluer procédure contentieuse", description: "Évaluer l'opportunité de démarrer une procédure juridique." },
  ],
};
