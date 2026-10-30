import { createContext, useCallback, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
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
  salaries_enabled: boolean;
  sms_sender_name: string;
  sms_sender_number: string | null;
  auto_sms_enabled: boolean;
  auto_sms_hour: number;
  receipt_signatory_name: string | null;
}

interface OrganizationSettingsContextType {
  settings: OrganizationSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<OrganizationSettings>) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string | null>;
  refetch: () => Promise<void>;
}

const OrganizationSettingsContext = createContext<OrganizationSettingsContextType | undefined>(undefined);

/**
 * Les réglages d'organisation ne sont plus chargés séparément : la ligne
 * `organizations` complète arrive déjà avec le profil, en une seule requête.
 * Ce contexte se contente de l'exposer sous le nom attendu par les pages et de
 * porter les écritures.
 */
export function OrganizationSettingsProvider({ children }: { children: ReactNode }) {
  const { organization, loading, refetch } = useProfile();
  const organizationId = organization?.id;
  const settings = (organization ?? null) as unknown as OrganizationSettings | null;

  const updateSettings = useCallback(
    async (updates: Partial<OrganizationSettings>) => {
      if (!organizationId) return false;
      const { error } = await supabase
        .from("organizations")
        .update(updates as never)
        .eq("id", organizationId);
      if (error) {
        toast.error("Erreur lors de la sauvegarde : " + error.message);
        return false;
      }
      toast.success("Paramètres sauvegardés");
      await refetch();
      return true;
    },
    [organizationId, refetch]
  );

  const uploadLogo = useCallback(
    async (file: File): Promise<string | null> => {
      if (!organizationId) return null;
      const ext = file.name.split(".").pop();
      const path = `${organizationId}/logo.${ext}`;

      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
      if (error) {
        toast.error("Erreur upload logo : " + error.message);
        return null;
      }
      // Bucket privé : URL signée longue durée (1 an)
      const { data: signed, error: signedErr } = await supabase.storage
        .from("logos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedErr || !signed?.signedUrl) {
        toast.error("Erreur génération URL logo");
        return null;
      }
      return signed.signedUrl;
    },
    [organizationId]
  );

  return (
    <OrganizationSettingsContext.Provider
      value={{ settings, loading, updateSettings, uploadLogo, refetch }}
    >
      {children}
    </OrganizationSettingsContext.Provider>
  );
}

export function useOrganizationSettings() {
  const ctx = useContext(OrganizationSettingsContext);
  if (!ctx) throw new Error("useOrganizationSettings must be inside OrganizationSettingsProvider");
  return ctx;
}
