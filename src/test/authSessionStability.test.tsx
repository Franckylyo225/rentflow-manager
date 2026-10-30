import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

/**
 * supabase-js re-reads and re-parses the session from storage on every auth
 * event (tab focus, token refresh, cross-tab broadcast), so `session.user` is a
 * new object each time even for the same account. These tests pin down that a
 * repeat event for the same user neither refetches the profile nor remounts the
 * tree — remounting is what used to wipe open forms.
 */

const state = vi.hoisted(() => ({
  authCallback: null as null | ((event: string, session: unknown) => void),
  session: null as unknown,
  fromCalls: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const rowFor = (table: string) => {
    if (table === "profiles") {
      return { data: { id: "p1", user_id: "u1", organization_id: "org1", full_name: "Test", is_approved: true }, error: null };
    }
    if (table === "user_roles") return { data: { role: "admin" }, error: null };
    return { data: { id: "org1", name: "Org" }, error: null };
  };

  const query = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "not", "limit"]) {
      q[method] = () => q;
    }
    q.maybeSingle = () => Promise.resolve(rowFor(table));
    q.single = () => Promise.resolve(rowFor(table));
    return q;
  };

  return {
    supabase: {
      from: (table: string) => {
        state.fromCalls.push(table);
        return query(table);
      },
      auth: {
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          state.authCallback = cb;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        getSession: () => Promise.resolve({ data: { session: state.session } }),
      },
    },
  };
});

const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");
const { ProfileProvider, useProfile } = await import("@/contexts/ProfileContext");

const sessionFor = (userId: string) => ({
  access_token: `token-${Math.random()}`,
  user: { id: userId, email: `${userId}@example.com` },
});

let mountCount = 0;
// Every run of an effect keyed on `[user]` is one wave of refetches, and — for
// the hooks that gate a spinner on it — one unmount of whatever is on screen.
let userEffectRuns = 0;

function UserIdentityProbe() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) userEffectRuns += 1;
  }, [user]);
  return null;
}

function Child() {
  const { profile } = useProfile();
  // A ref survives a re-render but not a remount, so it stands in for the local
  // state of an open form.
  const typed = useRef("brouillon en cours");

  useEffect(() => {
    mountCount += 1;
  }, []);

  return (
    <div>
      <span id="draft">{typed.current}</span>
      <span id="name">{profile?.full_name ?? "—"}</span>
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

const renderTree = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <AuthProvider>
        <UserIdentityProbe />
        <ProfileProvider>
          <Child />
        </ProfileProvider>
      </AuthProvider>
    );
  });
  await flush();
};

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

const text = (id: string) => container.querySelector(`#${id}`)?.textContent;
const profileFetches = () => state.fromCalls.filter(t => t === "profiles").length;

describe("auth session stability", () => {
  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    state.authCallback = null;
    state.session = sessionFor("u1");
    state.fromCalls = [];
    mountCount = 0;
    userEffectRuns = 0;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("loads the profile once on sign-in", async () => {
    await renderTree();

    expect(text("name")).toBe("Test");
    expect(profileFetches()).toBe(1);
    expect(mountCount).toBe(1);
  });

  it("ignores a repeat SIGNED_IN for the same user", async () => {
    await renderTree();
    expect(profileFetches()).toBe(1);

    // What the browser does when the tab regains focus, when the token is
    // refreshed, or when another tab broadcasts: same account, new object.
    await act(async () => {
      state.authCallback?.("SIGNED_IN", sessionFor("u1"));
    });
    await flush();

    expect(profileFetches()).toBe(1);
    expect(mountCount).toBe(1);
    expect(text("draft")).toBe("brouillon en cours");
    // The contract AuthContext has to honour: same account, same object, so no
    // `[user]` effect anywhere in the app is allowed to fire again.
    expect(userEffectRuns).toBe(1);
  });

  it("still reloads when the account actually changes", async () => {
    await renderTree();
    expect(profileFetches()).toBe(1);

    await act(async () => {
      state.authCallback?.("SIGNED_IN", sessionFor("u2"));
    });
    await flush();

    expect(profileFetches()).toBe(2);
    expect(userEffectRuns).toBe(2);
  });

  it("drops the profile on sign-out", async () => {
    await renderTree();

    await act(async () => {
      state.authCallback?.("SIGNED_OUT", null);
    });
    await flush();

    expect(text("name")).toBe("—");
  });
});
