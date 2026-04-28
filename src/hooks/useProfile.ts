import { useEffect, useState } from "react";
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

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRole(null);
      setOrganization(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as unknown as Profile);
        const orgRes = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profileRes.data.organization_id)
          .single();
        if (orgRes.data) setOrganization(orgRes.data as unknown as Organization);
      }

      if (roleRes.data) setRole(roleRes.data as UserRole);
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  return { profile, role, organization, loading };
}
