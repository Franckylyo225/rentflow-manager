import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DbExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface DbExpense {
  id: string;
  organization_id: string;
  category_id: string;
  property_id: string | null;
  city_id: string | null;
  country_id: string | null;
  amount: number;
  expense_date: string;
  description: string;
  expense_type: string;
  frequency: string;
  receipt_url: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
  expense_categories?: { name: string };
  properties?: { name: string } | null;
  cities?: { name: string } | null;
  employees?: { full_name: string } | null;
}

export interface DbEmployee {
  id: string;
  organization_id: string;
  full_name: string;
  position: string;
  monthly_salary: number;
  city_id: string | null;
  property_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cities?: { name: string } | null;
  properties?: { name: string } | null;
}

export function useExpenseCategories() {
  const { user } = useAuth();
  const [data, setData] = useState<DbExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data: result } = await supabase
      .from("expense_categories")
      .select("*")
      .order("name");
    if (result) setData(result as any);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [user]);
  return { data, loading, refetch };
}

export function useExpenses() {
  const { user } = useAuth();
  const [data, setData] = useState<DbExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data: result } = await supabase
      .from("expenses")
      .select("*, expense_categories(name), properties(name), cities(name), employees(full_name)")
      .order("expense_date", { ascending: false });
    if (result) setData(result as any);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [user]);
  return { data, loading, refetch };
}

export function useEmployees() {
  const { user } = useAuth();
  const [data, setData] = useState<DbEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data: result } = await supabase
      .from("employees")
      .select("*, cities(name), properties(name)")
      .order("full_name");
    if (result) setData(result as any);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [user]);
  return { data, loading, refetch };
}
