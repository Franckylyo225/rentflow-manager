import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
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

export interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  invite_token?: string;
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
  const { user } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  // Only the first load may block the UI: a later refetch must not flip
  // `loading` back on, or ProtectedRoute would unmount the page under it.
  const loadedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setRole(null);
      setOrganization(null);
      loadedRef.current = false;
      setLoading(false);
      return;
    }

    if (!loadedRef.current) setLoading(true);

    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);

    if (profileRes.error) console.error("Error fetching profile:", profileRes.error);
    if (roleRes.error) console.error("Error fetching user role:", roleRes.error);

    if (profileRes.data) {
      setProfile(profileRes.data as unknown as Profile);
      const orgRes = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profileRes.data.organization_id)
        .maybeSingle();
      if (orgRes.error) console.error("Error fetching organization:", orgRes.error);
      if (orgRes.data) setOrganization(orgRes.data as unknown as Organization);
    }

    if (roleRes.data) setRole(roleRes.data as UserRole);

    loadedRef.current = true;
    setLoading(false);
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
