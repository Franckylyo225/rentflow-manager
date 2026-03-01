import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

// Cities hook
export function useCities() {
  const { user } = useAuth();
  const [data, setData] = useState<DbCity[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data: result } = await supabase.from("cities").select("*").order("name");
    if (result) setData(result);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [user]);
  return { data, loading, refetch };
}

export interface DbCity {
  id: string;
  name: string;
  organization_id: string;
}

export interface DbProperty {
  id: string;
  organization_id: string;
  city_id: string;
  name: string;
  address: string;
  description: string;
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
  tenants?: { full_name: string; unit_id: string; units?: { name: string; property_id: string; properties?: { name: string; city_id: string; cities?: { name: string } } } };
}

// Specific hooks

export function useProperties() {
  const { user } = useAuth();
  const [data, setData] = useState<DbProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data: result } = await supabase
      .from("properties")
      .select("*, cities(name)")
      .order("name");
    if (result) setData(result as any);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [user]);
  return { data, loading, refetch };
}

export function useUnits(propertyId?: string) {
  const { user } = useAuth();
  const [data, setData] = useState<DbUnit[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("units").select("*, properties(name, organization_id)").order("name");
    if (propertyId) query = query.eq("property_id", propertyId);
    const { data: result } = await query;
    if (result) setData(result as any);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [user, propertyId]);
  return { data, loading, refetch };
}

export function useTenants() {
  const { user } = useAuth();
  const [data, setData] = useState<DbTenant[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data: result } = await supabase
      .from("tenants")
      .select("*, units(name, property_id, properties(name, city_id, cities(name)))")
      .eq("is_active", true)
      .order("full_name");
    if (result) setData(result as any);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [user]);
  return { data, loading, refetch };
}

export function useRentPayments() {
  const { user } = useAuth();
  const [data, setData] = useState<DbRentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    if (!user) return;
    setLoading(true);
    const { data: result } = await supabase
      .from("rent_payments")
      .select("*, tenants(full_name, unit_id, units(name, property_id, properties(name, city_id, cities(name))))")
      .order("due_date", { ascending: false });
    if (result) setData(result as any);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [user]);
  return { data, loading, refetch };
}
