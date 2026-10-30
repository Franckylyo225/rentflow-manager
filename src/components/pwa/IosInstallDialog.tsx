import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Share, SquarePlus } from "lucide-react";

/**
 * Safari ne permet aucune installation par code : sur iPhone et iPad, la seule
 * option est de montrer le chemin à suivre.
 */
export function IosInstallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const steps = [
    {
      icon: Share,
      title: "Appuyez sur Partager",
      body: "L'icône en forme de carré avec une flèche, dans la barre de Safari.",
    },
    {
      icon: SquarePlus,
      title: "Choisissez « Sur l'écran d'accueil »",
      body: "Faites défiler le menu vers le bas pour la trouver.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter à l'écran d'accueil</DialogTitle>
          <DialogDescription>
            Safari demande de faire cette étape à la main. Deux appuis suffisent.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 pt-2">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <step.icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">
                  {index + 1}. {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
