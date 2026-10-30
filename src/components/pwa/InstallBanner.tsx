import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { IosInstallDialog } from "./IosInstallDialog";

const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

/**
 * Bandeau discret proposant d'installer l'application, affiché une fois
 * l'utilisateur connecté. Fermé sans installer, il ne revient pas avant 7 jours.
 */
export function InstallBanner() {
  const { canShowBanner, method, install, dismiss } = usePwaInstall();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (!canShowBanner) return null;

  const destination = isTouchDevice() ? "votre écran d'accueil" : "votre bureau";

  const handleInstall = async () => {
    if (method === "ios") {
      setShowIosSteps(true);
      return;
    }
    await install();
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-0 z-40 p-4 sm:left-auto sm:right-6 sm:bottom-6 sm:p-0 lg:left-60"
        >
          <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg sm:mx-0 sm:ml-auto">
            <img src="/icon-192.png" alt="" className="h-10 w-10 flex-shrink-0 rounded-xl" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Installer SCI Binieba</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Accédez à la plateforme directement depuis {destination}, sans passer par le
                navigateur.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={handleInstall}>
                  Installer
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                  Plus tard
                </Button>
              </div>
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Fermer"
              className="-mr-1 -mt-1 flex-shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <IosInstallDialog open={showIosSteps} onOpenChange={setShowIosSteps} />
    </>
  );
}
