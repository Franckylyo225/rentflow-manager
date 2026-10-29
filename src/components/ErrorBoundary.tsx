import { Component, ReactNode } from "react";

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("App crash:", error);
    // Stale cached files after a new version: reload once automatically
    const msg = String(error?.message || "");
    if (/dynamically imported module|Loading chunk|Importing a module script failed/i.test(msg)
        && !sessionStorage.getItem("chunk_reload")) {
      sessionStorage.setItem("chunk_reload", "1");
      window.location.reload();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Un problème est survenu</h1>
          <p className="text-muted-foreground">
            La page n'a pas pu s'afficher. Rechargez la page ; si le problème persiste, transmettez ce message à l'administrateur.
          </p>
          <p className="text-xs text-muted-foreground break-words bg-muted rounded-md p-2">{this.state.error.message}</p>
          <div className="flex gap-2 justify-center">
            <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground" onClick={() => window.location.reload()}>
              Recharger
            </button>
            <button className="px-4 py-2 rounded-md border border-border text-foreground" onClick={() => { sessionStorage.clear(); window.location.href = "/auth"; }}>
              Se reconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }
}
