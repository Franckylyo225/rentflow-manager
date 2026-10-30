import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_approved: boolean;
  is_active?: boolean;
  sms_2fa_enabled?: boolean;
  sms_2fa_phone?: string | null;
}

export interface UserRole {
  role: "admin" | "gestionnaire" | "comptable" | "super_admin";
}

/**
 * Ligne `organizations` complète : elle porte à la fois l'identité de
 * l'organisation et ses réglages, que OrganizationSettingsContext réutilise au
 * lieu de refaire la même requête.
 */
export interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  invite_token?: string;
  [key: string]: unknown;
}

interface ProfileContextType {
  profile: Profile | null;
  role: UserRole | null;
  organization: Organization | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * Loads the profile, role and organization once per session and shares them.
 * Previously every consumer ran its own copy of this fetch, so a single page
 * could issue the same three queries half a dozen times over.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  // Identifiant du compte dont le chargement est terminé, abouti ou non.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // `loading` est calculé pendant le rendu, et non posé depuis un effet.
  // Posé depuis un effet, il restait brièvement à `false` entre le rendu où
  // l'utilisateur apparaît et l'effet qui lance la requête : ProtectedRoute
  // voyait alors un profil absent sans chargement en cours, montait la page,
  // puis la démontait au rendu suivant. Chaque ouverture montait donc l'écran
  // deux fois.
  //
  // `loadedFor` est renseigné même quand la requête échoue : sinon un profil
  // illisible laisserait un spinner perpétuel.
  const loading = authLoading || (!!userId && loadedFor !== userId);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setRole(null);
      setOrganization(null);
      setLoadedFor(null);
      return;
    }

    const [profileRes, roleRes] = await Promise.all([
      // `profiles.organization_id` référence `organizations.id`, donc PostgREST
      // sait ramener l'organisation dans la même requête. C'était auparavant un
      // second aller-retour, qui ne pouvait partir qu'une fois le profil reçu.
      supabase.from("profiles").select("*, organizations(*)").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);

    if (profileRes.error) console.error("Error fetching profile:", profileRes.error);
    if (roleRes.error) console.error("Error fetching user role:", roleRes.error);

    if (profileRes.data) {
      const { organizations, ...profileRow } = profileRes.data as Record<string, unknown>;
      setProfile(profileRow as unknown as Profile);
      setOrganization((organizations ?? null) as Organization | null);
    }

    if (roleRes.data) setRole(roleRes.data as UserRole);

    setLoadedFor(userId);
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return (
    <ProfileContext.Provider value={{ profile, role, organization, loading, refetch: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be inside ProfileProvider");
  return ctx;
}
