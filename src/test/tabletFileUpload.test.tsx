import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Reproduit ce qui se passe sur tablette quand on ajoute un fichier au
 * patrimoine.
 *
 * Ouvrir le sélecteur de fichiers met la page en arrière-plan. Au retour, le
 * navigateur émet `visibilitychange`, et supabase-js y réagit en relisant la
 * session depuis le storage puis en réémettant `SIGNED_IN` — avec un objet
 * `user` neuf, même s'il s'agit du même compte. C'est la séquence simulée ici.
 *
 * Avant correction, cet événement relançait le chargement du profil, et
 * `ProtectedRoute` remplaçait toute l'application par son spinner : le
 * dialogue se fermait et les fichiers choisis étaient perdus. `ProtectedRoute`
 * fait donc partie du montage testé.
 */

const state = vi.hoisted(() => ({
  authCallback: null as null | ((event: string, session: unknown) => void),
  session: null as unknown,
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
          is_active: true,
          sms_2fa_enabled: false,
          organizations: { id: "org1", name: "Org" },
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
    const deferred = () => new Promise(resolve => setTimeout(() => resolve(rowFor(table)), 0));
    q.maybeSingle = deferred;
    q.single = deferred;
    return q;
  };

  return {
    supabase: {
      from: (table: string) => query(table),
      auth: {
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          state.authCallback = cb;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        getSession: () => Promise.resolve({ data: { session: state.session } }),
        mfa: {
          getAuthenticatorAssuranceLevel: () =>
            Promise.resolve({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null }),
        },
      },
    },
  };
});

const { AuthProvider } = await import("@/contexts/AuthContext");
const { ProfileProvider } = await import("@/contexts/ProfileContext");
const { ProtectedRoute } = await import("@/components/auth/ProtectedRoute");

const sessionFor = (userId: string) => ({
  access_token: `token-${Math.random()}`,
  user: { id: userId, email: `${userId}@example.com` },
});

let mountCount = 0;

/** Tient le même rôle que le dialogue « Ajouter des documents ». */
function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    mountCount += 1;
  }, []);

  return (
    <div>
      <button id="open" onClick={() => setOpen(true)}>
        Ajouter des documents
      </button>
      {open && (
        <div id="dialog">
          <button id="pick" onClick={() => setFiles(prev => [...prev, "acte-de-vente.pdf"])}>
            Fichiers
          </button>
          <span id="files">{files.join(",")}</span>
        </div>
      )}
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

const click = async (id: string) => {
  const el = container.querySelector(`#${id}`) as HTMLButtonElement | null;
  if (!el) throw new Error(`élément #${id} absent`);
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

/**
 * Le retour du sélecteur de fichiers : la page redevient visible et
 * supabase-js réémet `SIGNED_IN` pour le même compte, objet `user` neuf.
 */
const returnFromFilePicker = async () => {
  await act(async () => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    state.authCallback?.("SIGNED_IN", sessionFor("u1"));
  });
  await flush();
};

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
              <ProtectedRoute>
                <UploadDialog />
              </ProtectedRoute>
            </ProfileProvider>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  });
  await flush();
  await flush();
};

describe("ajout d'un fichier au patrimoine sur tablette", () => {
  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    state.authCallback = null;
    state.session = sessionFor("u1");
    mountCount = 0;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("garde le formulaire ouvert au retour du sélecteur de fichiers", async () => {
    await render();
    await click("open");
    expect(container.querySelector("#dialog")).not.toBeNull();

    await returnFromFilePicker();

    expect(container.querySelector("#dialog")).not.toBeNull();
    expect(mountCount).toBe(1);
  });

  it("conserve les fichiers déjà choisis", async () => {
    await render();
    await click("open");
    await click("pick");
    expect(container.querySelector("#files")?.textContent).toBe("acte-de-vente.pdf");

    await returnFromFilePicker();

    expect(container.querySelector("#files")?.textContent).toBe("acte-de-vente.pdf");
  });

  it("résiste à plusieurs allers-retours, comme un envoi multi-fichiers", async () => {
    await render();
    await click("open");

    for (let i = 0; i < 3; i += 1) {
      await click("pick");
      await returnFromFilePicker();
    }

    expect(container.querySelector("#dialog")).not.toBeNull();
    expect(container.querySelector("#files")?.textContent).toBe(
      "acte-de-vente.pdf,acte-de-vente.pdf,acte-de-vente.pdf"
    );
    expect(mountCount).toBe(1);
  });

  it("supporte aussi un rafraîchissement de jeton pendant la sélection", async () => {
    await render();
    await click("open");
    await click("pick");

    await act(async () => {
      state.authCallback?.("TOKEN_REFRESHED", sessionFor("u1"));
    });
    await flush();

    expect(container.querySelector("#dialog")).not.toBeNull();
    expect(container.querySelector("#files")?.textContent).toBe("acte-de-vente.pdf");
    expect(mountCount).toBe(1);
  });
});
