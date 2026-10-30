import { useState } from "react";
import { Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { IosInstallDialog } from "./IosInstallDialog";

/**
 * Rappel permanent dans la barre latérale : contrairement au bandeau, il reste
 * disponible même après une fermeture, pour qui veut installer plus tard.
 */
export function InstallMenuItem() {
  const { canInstall, method, install } = usePwaInstall();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (!canInstall) return null;

  const handleClick = async () => {
    if (method === "ios") {
      setShowIosSteps(true);
      return;
    }
    await install();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
      >
        <Download className="h-4 w-4 flex-shrink-0" />
        Installer l'application
      </button>

      <IosInstallDialog open={showIosSteps} onOpenChange={setShowIosSteps} />
    </>
  );
}
