import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Vérifie ce qui coûtait le plus cher au chargement : les mêmes tables
 * demandées plusieurs fois sur un même écran, et une cascade d'allers-retours
 * avant la première requête de données.
 */

const state = vi.hoisted(() => ({
  session: { access_token: "t", user: { id: "u1" } } as unknown,
  fromCalls: [] as string[],
  selects: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const rowFor = (table: string) => {
    if (table === "profiles") {
      return {
        data: {
          id: "p1",
          user_id: "u1",
          organization_id: "org1",
          full_name: "Test",
          is_approved: true,
          organizations: { id: "org1", name: "Org", salaries_enabled: true },
        },
        error: null,
      };
    }
    if (table === "user_roles") return { data: { role: "admin" }, error: null };
    return { data: [], error: null };
  };

  const query = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const method of ["eq", "order", "not", "limit"]) q[method] = () => q;
    q.select = (columns: string) => {
      state.selects.push(`${table}:${columns}`);
      return q;
    };
    q.maybeSingle = () => Promise.resolve(rowFor(table));
    q.single = () => Promise.resolve(rowFor(table));
    // Les listes sont attendues directement (`await query`).
    q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(rowFor(table)).then(resolve);
    return q;
  };

  return {
    supabase: {
      from: (table: string) => {
        state.fromCalls.push(table);
        return query(table);
      },
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getSession: () => Promise.resolve({ data: { session: state.session } }),
      },
    },
  };
});

const { AuthProvider } = await import("@/contexts/AuthContext");
const { ProfileProvider, useProfile } = await import("@/contexts/ProfileContext");
const { useProperties, useTenants, useUnits } = await import("@/hooks/useData");

/** Imite le Dashboard : il demande biens, unités et locataires. */
function PageLikeDashboard() {
  useProperties();
  useUnits();
  useTenants();
  return null;
}

/** Imite GlobalSearch, monté en parallèle dans l'en-tête, mêmes tables. */
function HeaderSearch({ open }: { open: boolean }) {
  useProperties({ enabled: open });
  useUnits(undefined, { enabled: open });
  useTenants({ enabled: open });
  return null;
}

function OrgName() {
  const { organization } = useProfile();
  return <span id="org">{(organization?.name as string) ?? "—"}</span>;
}

let container: HTMLDivElement;
let root: Root;

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

const render = async (ui: React.ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <ProfileProvider>{ui}</ProfileProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  });
  await flush();
  await flush();
};

const countOf = (table: string) => state.fromCalls.filter(t => t === table).length;

describe("chargement des données", () => {
  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    state.fromCalls = [];
    state.selects = [];
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("ne charge l'organisation qu'avec le profil, sans requête séparée", async () => {
    await render(<OrgName />);

    expect(container.querySelector("#org")?.textContent).toBe("Org");
    expect(countOf("profiles")).toBe(1);
    // Le second aller-retour vers `organizations` a disparu : l'organisation
    // arrive intégrée à la requête de profil.
    expect(countOf("organizations")).toBe(0);
    expect(state.selects).toContain("profiles:*, organizations(*)");
  });

  it("ne demande pas deux fois la même table quand deux composants la partagent", async () => {
    await render(
      <>
        <PageLikeDashboard />
        <HeaderSearch open />
      </>
    );

    // Six appels de hooks, trois tables, une requête chacune.
    expect(countOf("properties")).toBe(1);
    expect(countOf("units")).toBe(1);
    expect(countOf("tenants")).toBe(1);
  });

  it("ne charge rien pour la recherche tant qu'elle n'est pas ouverte", async () => {
    await render(<HeaderSearch open={false} />);

    expect(countOf("properties")).toBe(0);
    expect(countOf("units")).toBe(0);
    expect(countOf("tenants")).toBe(0);
  });
});
