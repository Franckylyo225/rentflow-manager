/**
 * Installation de l'application (PWA).
 *
 * Chrome émet `beforeinstallprompt` très tôt, souvent avant que React ait monté
 * quoi que ce soit, et ne le réémet pas. L'événement est donc capté ici, au
 * niveau module, et conservé jusqu'à ce qu'un composant veuille s'en servir.
 *
 * Safari (iPhone, iPad) n'implémente pas cet événement et ne permet aucune
 * installation par code : il faut y afficher les instructions manuelles.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "binieba_install_dismissed_at";
const DISMISS_DAYS = 7;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(listener => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", event => {
    // Empêche la barre d'installation native de Chrome : la proposition est
    // faite au bon moment, après connexion, par notre propre bandeau.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    try {
      localStorage.removeItem(DISMISSED_KEY);
    } catch {
      // Navigation privée ou stockage bloqué : sans effet.
    }
    notify();
  });
}

export const subscribeToInstallPrompt = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getInstallPrompt = () => deferredPrompt;

export const consumeInstallPrompt = () => {
  deferredPrompt = null;
  notify();
};

/** iPadOS 13+ se déclare comme un Mac : le tactile sert à le distinguer. */
export const isIosDevice = () => {
  if (typeof navigator === "undefined") return false;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
};

/** Vrai lorsque la page tourne déjà dans l'application installée. */
export const isRunningStandalone = () => {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
};

export const wasRecentlyDismissed = () => {
  try {
    const at = localStorage.getItem(DISMISSED_KEY);
    if (!at) return false;
    const elapsed = Date.now() - Number(at);
    return elapsed >= 0 && elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    // Stockage inaccessible : mieux vaut proposer que rester muet.
    return false;
  }
};

export const rememberDismissal = () => {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Sans effet : le bandeau réapparaîtra au prochain chargement.
  }
};

export function registerServiceWorker() {
  // Inutile en développement, où il ne ferait que gêner le rechargement à chaud.
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => {
      console.error("Service worker non enregistré :", error);
    });
  });
}
