import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  consumeInstallPrompt,
  getInstallPrompt,
  isIosDevice,
  isRunningStandalone,
  rememberDismissal,
  subscribeToInstallPrompt,
  wasRecentlyDismissed,
} from "@/lib/pwa";

export type InstallMethod = "prompt" | "ios" | "none";

export function usePwaInstall() {
  const prompt = useSyncExternalStore(subscribeToInstallPrompt, getInstallPrompt, () => null);

  const [installed, setInstalled] = useState(isRunningStandalone);
  const [dismissed, setDismissed] = useState(wasRecentlyDismissed);

  // L'utilisateur peut installer depuis le menu du navigateur pendant que
  // l'onglet est ouvert : le bandeau doit disparaître sans rechargement.
  useEffect(() => {
    const media = window.matchMedia?.("(display-mode: standalone)");
    if (!media) return;
    const onChange = () => setInstalled(isRunningStandalone());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const ios = isIosDevice();

  // Safari ne permet aucune installation par code : seules des instructions
  // manuelles sont possibles.
  const method: InstallMethod = installed ? "none" : prompt ? "prompt" : ios ? "ios" : "none";

  const dismiss = useCallback(() => {
    rememberDismissal();
    setDismissed(true);
  }, []);

  /** Renvoie true si l'application a bien été installée. */
  const install = useCallback(async () => {
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // L'événement n'est utilisable qu'une fois, accepté ou non.
    consumeInstallPrompt();
    if (outcome === "accepted") {
      setInstalled(true);
      return true;
    }
    dismiss();
    return false;
  }, [prompt, dismiss]);

  return {
    /** Comment proposer l'installation sur cet appareil. */
    method,
    /** Le bandeau peut-il s'afficher maintenant ? */
    canShowBanner: method !== "none" && !dismissed,
    /** L'entrée de menu reste visible même après fermeture du bandeau. */
    canInstall: method !== "none",
    installed,
    install,
    dismiss,
  };
}
