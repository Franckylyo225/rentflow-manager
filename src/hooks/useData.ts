import { supabase } from "@/integrations/supabase/client";
import { useSupabaseList, type ListOptions } from "@/hooks/useSupabaseList";

export interface DbCountry {
  id: string;
  name: string;
  code: string;
  organization_id: string;
}

export interface DbCity {
  id: string;
  name: string;
  organization_id: string;
  country_id?: string;
  countries?: { name: string };
}

export interface DbProperty {
  id: string;
  organization_id: string;
  city_id: string;
  name: string;
  address: string;
  description: string;
  type: string;
  created_at: string;
  cities?: { name: string };
}

export interface DbUnit {
  id: string;
  property_id: string;
  name: string;
  rent: number;
  charges: number;
  status: "occupied" | "vacant";
  properties?: { name: string; organization_id: string };
}

export interface DbTenant {
  id: string;
  unit_id: string;
  full_name: string;
  phone: string;
  email: string;
  id_number: string;
  lease_start: string;
  lease_duration: number;
  rent: number;
  deposit: number;
  is_active: boolean;
  units?: { name: string; property_id: string; properties?: { name: string; city_id: string; cities?: { name: string } } };
}

export interface DbRentPayment {
  id: string;
  tenant_id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: "pending" | "paid" | "partial" | "late";
  month: string;
  tenants?: { full_name: string; phone?: string; email?: string; unit_id: string; units?: { name: string; property_id: string; properties?: { name: string; city_id: string; cities?: { name: string } } } };
}

async function rows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export function useCountries(options?: ListOptions) {
  return useSupabaseList<DbCountry>(
    ["countries"],
    () => rows<DbCountry>(supabase.from("countries").select("*").order("name")),
    options
  );
}

export function useCities(options?: ListOptions) {
  return useSupabaseList<DbCity>(
    ["cities"],
    () => rows<DbCity>(supabase.from("cities").select("*, countries(name)").order("name")),
    options
  );
}

export function useProperties(options?: ListOptions) {
  return useSupabaseList<DbProperty>(
    ["properties"],
    () => rows<DbProperty>(supabase.from("properties").select("*, cities(name)").order("name")),
    options
  );
}

export function useUnits(propertyId?: string, options?: ListOptions) {
  return useSupabaseList<DbUnit>(
    ["units", propertyId ?? null],
    () => {
      let query = supabase.from("units").select("*, properties(name, organization_id)").order("name");
      if (propertyId) query = query.eq("property_id", propertyId);
      return rows<DbUnit>(query);
    },
    options
  );
}

export function useTenants(options?: ListOptions) {
  return useSupabaseList<DbTenant>(
    ["tenants"],
    () =>
      rows<DbTenant>(
        supabase
          .from("tenants")
          .select("*, units(name, property_id, properties(name, city_id, cities(name)))")
          .eq("is_active", true)
          .order("full_name")
      ),
    options
  );
}

export function useRentPayments(options?: ListOptions) {
  return useSupabaseList<DbRentPayment>(
    ["rent_payments"],
    () =>
      rows<DbRentPayment>(
        supabase
          .from("rent_payments")
          .select("*, tenants(full_name, phone, email, unit_id, units(name, property_id, properties(name, city_id, cities(name))))")
          .order("due_date", { ascending: false })
      ),
    options
  );
}
