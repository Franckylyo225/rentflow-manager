import { supabase } from "@/integrations/supabase/client";
import { useSupabaseList, type ListOptions } from "@/hooks/useSupabaseList";

export interface EscalationTask {
  id: string;
  rent_payment_id: string;
  title: string;
  description: string;
  escalation_level: number;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useEscalationTasks(rentPaymentId?: string, options?: ListOptions) {
  return useSupabaseList<EscalationTask>(
    ["escalation_tasks", rentPaymentId ?? null],
    async () => {
      let query = supabase.from("escalation_tasks").select("*").order("created_at", { ascending: false });
      if (rentPaymentId) query = query.eq("rent_payment_id", rentPaymentId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as EscalationTask[];
    },
    options
  );
}
