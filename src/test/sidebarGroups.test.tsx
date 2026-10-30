import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Vérifie le regroupement du menu latéral et son interaction avec les réglages. */

const state = vi.hoisted(() => ({
  salariesEnabled: true,
  session: { access_token: "t", user: { id: "u1" } } as unknown,
}));

vi.mock("@/integrations/supabase/client", () => {
  const rowFor = (table: string) => {
    if (table === "profiles") {
      return {
        data: {
          id: "p1",
          user_id: "u1",
          organization_id: "org1",
          full_name: "Kouadio Jean",
          is_approved: true,
          is_active: true,
          organizations: { id: "org1", name: "Org", salaries_enabled: state.salariesEnabled },
        },
        error: null,
      };
    }
    if (table === "user_roles") return { data: { role: "admin" }, error: null };
    return { data: [], error: null };
  };

  const query = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "not", "limit"]) q[method] = () => q;
    q.maybeSingle = () => Promise.resolve(rowFor(table));
    q.single = () => Promise.resolve(rowFor(table));
    return q;
  };

  return {
    supabase: {
      from: (table: string) => query(table),
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getSession: () => Promise.resolve({ data: { session: state.session } }),
      },
    },
  };
});

const { AuthProvider } = await import("@/contexts/AuthContext");
const { ProfileProvider } = await import("@/contexts/ProfileContext");
const { OrganizationSettingsProvider } = await import("@/contexts/OrganizationSettingsContext");
const { AppSidebar } = await import("@/components/layout/AppSidebar");

let container: HTMLDivElement;
let root: Root;

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

const render = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AuthProvider>
            <ProfileProvider>
              <OrganizationSettingsProvider>
                <AppSidebar open onClose={() => {}} />
              </OrganizationSettingsProvider>
            </ProfileProvider>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  });
  await flush();
  await flush();
};

/** Titres de groupe et libellés de liens, dans l'ordre d'affichage. */
const navOutline = () => {
  const nav = container.querySelector("nav");
  if (!nav) throw new Error("nav absente");
  return [...nav.querySelectorAll("p, a")].map(el =>
    el.tagName === "P" ? `# ${el.textContent}` : el.textContent?.trim()
  );
};

describe("menu latéral groupé", () => {
  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    state.salariesEnabled = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("affiche les entrées sous leur catégorie, dans l'ordre", async () => {
    await render();

    expect(navOutline()).toEqual([
      "Tableau de bord",
      "# Portefeuille",
      "Biens",
      "Patrimoine",
      "Locataires",
      "# Finances",
      "Loyers",
      "Dépenses",
      "Salaires",
      "Rapports",
      "# Système",
      "Notifications",
      "Centre d'aide",
      "Paramètres",
    ]);
  });

  it("laisse le tableau de bord sans titre de groupe", async () => {
    await render();
    const first = container.querySelector("nav")?.firstElementChild;
    expect(first?.querySelector("p")).toBeNull();
    expect(first?.querySelector("a")?.textContent?.trim()).toBe("Tableau de bord");
  });

  it("retire Salaires sans laisser Finances orphelin quand les salaires sont désactivés", async () => {
    state.salariesEnabled = false;
    await render();

    const outline = navOutline();
    expect(outline).not.toContain("Salaires");
    // Le groupe garde ses autres entrées, donc son titre reste justifié.
    expect(outline).toContain("# Finances");
    expect(outline).toContain("Loyers");
    expect(outline).toContain("Rapports");
  });

  it("permet au menu de défiler s'il dépasse en hauteur", async () => {
    await render();
    expect(container.querySelector("nav")?.className).toContain("overflow-y-auto");
  });
});
