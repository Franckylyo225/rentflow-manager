import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export interface OrganizationSettings {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  currency: string;
  date_format: string;
  timezone: string;
  legal_name: string | null;
  legal_id: string | null;
  legal_address: string | null;
  late_fee_enabled: boolean;
  late_fee_type: string;
  late_fee_value: number;
  late_fee_grace_days: number;
  accepted_payment_methods: string[];
  fiscal_year_start: number;
  deposit_months: number;
  rent_due_day: number;
}

export function useOrganizationSettings() {
  const { profile } = useProfile();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();
    if (data) setSettings(data as unknown as OrganizationSettings);
    if (error) console.error("Error fetching org settings:", error);
    setLoading(false);
  }, [profile?.organization_id]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSettings = async (updates: Partial<OrganizationSettings>) => {
    if (!profile?.organization_id) return false;
    const { error } = await supabase
      .from("organizations")
      .update(updates as any)
      .eq("id", profile.organization_id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde : " + error.message);
      return false;
    }
    toast.success("Paramètres sauvegardés");
    await fetchSettings();
    return true;
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    if (!profile?.organization_id) return null;
    const ext = file.name.split(".").pop();
    const path = `${profile.organization_id}/logo.${ext}`;
    
    const { error } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erreur upload logo : " + error.message);
      return null;
    }
    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
    return urlData.publicUrl;
  };

  return { settings, loading, updateSettings, uploadLogo, refetch: fetchSettings };
}
