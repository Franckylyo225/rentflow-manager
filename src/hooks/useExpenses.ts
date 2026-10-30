import { supabase } from "@/integrations/supabase/client";
import { useSupabaseList, type ListOptions } from "@/hooks/useSupabaseList";

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
  unit_id: string | null;
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
  units?: { name: string } | null;
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

async function rows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export function useExpenseCategories(options?: ListOptions) {
  return useSupabaseList<DbExpenseCategory>(
    ["expense_categories"],
    () => rows<DbExpenseCategory>(supabase.from("expense_categories").select("*").order("name")),
    options
  );
}

export function useExpenses(options?: ListOptions) {
  return useSupabaseList<DbExpense>(
    ["expenses"],
    () =>
      rows<DbExpense>(
        supabase
          .from("expenses")
          .select("*, expense_categories(name), properties(name), units(name), cities(name), employees(full_name)")
          .order("expense_date", { ascending: false })
      ),
    options
  );
}

export function useEmployees(options?: ListOptions) {
  return useSupabaseList<DbEmployee>(
    ["employees"],
    () => rows<DbEmployee>(supabase.from("employees").select("*, cities(name), properties(name)").order("full_name")),
    options
  );
}
