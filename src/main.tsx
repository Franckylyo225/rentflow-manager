import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
// Importé avant le rendu : Chrome émet `beforeinstallprompt` très tôt et ne
// le réémet jamais, il faut donc écouter dès le chargement du module.
import { registerServiceWorker } from "./lib/pwa";
import "./index.css";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
