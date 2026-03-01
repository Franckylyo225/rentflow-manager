import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

export function useEscalationTasks(rentPaymentId?: string) {
  const { user } = useAuth();
  const [data, setData] = useState<EscalationTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("escalation_tasks").select("*").order("created_at", { ascending: false });
    if (rentPaymentId) query = query.eq("rent_payment_id", rentPaymentId);
    const { data: result } = await query;
    if (result) setData(result as any);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [user, rentPaymentId]);
  return { data, loading, refetch };
}
