import { Building2, Users, CreditCard, LayoutDashboard, Settings, Bell, MapPin } from "lucide-react";

export interface City {
  id: string;
  name: string;
  propertyCount: number;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  cityId: string;
  cityName: string;
  unitCount: number;
  occupiedUnits: number;
  totalRevenue: number;
}

export interface Unit {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  rent: number;
  charges: number;
  status: "occupied" | "vacant";
  tenantId?: string;
  tenantName?: string;
}

export interface Tenant {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  idNumber: string;
  leaseStart: string;
  leaseDuration: number; // months
  rent: number;
  deposit: number;
  unitId: string;
  unitName: string;
  propertyName: string;
  cityName: string;
}

export interface RentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  unitName: string;
  propertyName: string;
  amount: number;
  dueDate: string;
  status: "paid" | "late" | "partial" | "pending";
  paidAmount: number;
  paidDate?: string;
}

export const cities: City[] = [
  { id: "c1", name: "Casablanca", propertyCount: 5 },
  { id: "c2", name: "Rabat", propertyCount: 3 },
  { id: "c3", name: "Marrakech", propertyCount: 2 },
  { id: "c4", name: "Tanger", propertyCount: 2 },
];

export const properties: Property[] = [
  { id: "p1", name: "Résidence Al Firdaws", address: "12 Rue Hassan II", cityId: "c1", cityName: "Casablanca", unitCount: 8, occupiedUnits: 6, totalRevenue: 42000 },
  { id: "p2", name: "Immeuble Belvédère", address: "45 Bd Zerktouni", cityId: "c1", cityName: "Casablanca", unitCount: 12, occupiedUnits: 10, totalRevenue: 78000 },
  { id: "p3", name: "Résidence Riad Agdal", address: "8 Av Mohammed V", cityId: "c2", cityName: "Rabat", unitCount: 6, occupiedUnits: 5, totalRevenue: 35000 },
  { id: "p4", name: "Villa Gueliz", address: "23 Rue de la Liberté", cityId: "c3", cityName: "Marrakech", unitCount: 4, occupiedUnits: 4, totalRevenue: 32000 },
  { id: "p5", name: "Résidence Marina Bay", address: "67 Corniche", cityId: "c4", cityName: "Tanger", unitCount: 10, occupiedUnits: 7, totalRevenue: 56000 },
];

export const units: Unit[] = [
  { id: "u1", propertyId: "p1", propertyName: "Résidence Al Firdaws", name: "Apt 101", rent: 7000, charges: 500, status: "occupied", tenantId: "t1", tenantName: "Ahmed Benali" },
  { id: "u2", propertyId: "p1", propertyName: "Résidence Al Firdaws", name: "Apt 102", rent: 6500, charges: 500, status: "occupied", tenantId: "t2", tenantName: "Fatima Zahra" },
  { id: "u3", propertyId: "p1", propertyName: "Résidence Al Firdaws", name: "Apt 201", rent: 7500, charges: 600, status: "vacant" },
  { id: "u4", propertyId: "p2", propertyName: "Immeuble Belvédère", name: "Bureau A1", rent: 12000, charges: 1000, status: "occupied", tenantId: "t3", tenantName: "Karim Idrissi" },
  { id: "u5", propertyId: "p2", propertyName: "Immeuble Belvédère", name: "Bureau A2", rent: 8000, charges: 800, status: "occupied", tenantId: "t4", tenantName: "Sara Alaoui" },
  { id: "u6", propertyId: "p3", propertyName: "Résidence Riad Agdal", name: "Apt 1", rent: 5500, charges: 400, status: "occupied", tenantId: "t5", tenantName: "Youssef Amrani" },
  { id: "u7", propertyId: "p4", propertyName: "Villa Gueliz", name: "Villa A", rent: 15000, charges: 1200, status: "occupied", tenantId: "t6", tenantName: "Nadia Berrada" },
  { id: "u8", propertyId: "p5", propertyName: "Résidence Marina Bay", name: "Apt 301", rent: 9000, charges: 700, status: "vacant" },
];

export const tenants: Tenant[] = [
  { id: "t1", fullName: "Ahmed Benali", phone: "+212 6 12 34 56 78", email: "ahmed.benali@email.com", idNumber: "AB123456", leaseStart: "2024-01-15", leaseDuration: 12, rent: 7000, deposit: 14000, unitId: "u1", unitName: "Apt 101", propertyName: "Résidence Al Firdaws", cityName: "Casablanca" },
  { id: "t2", fullName: "Fatima Zahra", phone: "+212 6 23 45 67 89", email: "fatima.zahra@email.com", idNumber: "FZ789012", leaseStart: "2024-03-01", leaseDuration: 24, rent: 6500, deposit: 13000, unitId: "u2", unitName: "Apt 102", propertyName: "Résidence Al Firdaws", cityName: "Casablanca" },
  { id: "t3", fullName: "Karim Idrissi", phone: "+212 6 34 56 78 90", email: "karim.idrissi@email.com", idNumber: "KI345678", leaseStart: "2023-09-01", leaseDuration: 36, rent: 12000, deposit: 24000, unitId: "u4", unitName: "Bureau A1", propertyName: "Immeuble Belvédère", cityName: "Casablanca" },
  { id: "t4", fullName: "Sara Alaoui", phone: "+212 6 45 67 89 01", email: "sara.alaoui@email.com", idNumber: "SA901234", leaseStart: "2024-06-15", leaseDuration: 12, rent: 8000, deposit: 16000, unitId: "u5", unitName: "Bureau A2", propertyName: "Immeuble Belvédère", cityName: "Casablanca" },
  { id: "t5", fullName: "Youssef Amrani", phone: "+212 6 56 78 90 12", email: "youssef.amrani@email.com", idNumber: "YA567890", leaseStart: "2024-02-01", leaseDuration: 12, rent: 5500, deposit: 11000, unitId: "u6", unitName: "Apt 1", propertyName: "Résidence Riad Agdal", cityName: "Rabat" },
  { id: "t6", fullName: "Nadia Berrada", phone: "+212 6 67 89 01 23", email: "nadia.berrada@email.com", idNumber: "NB678901", leaseStart: "2024-04-01", leaseDuration: 24, rent: 15000, deposit: 30000, unitId: "u7", unitName: "Villa A", propertyName: "Villa Gueliz", cityName: "Marrakech" },
];

export const rentPayments: RentPayment[] = [
  { id: "r1", tenantId: "t1", tenantName: "Ahmed Benali", unitName: "Apt 101", propertyName: "Résidence Al Firdaws", amount: 7000, dueDate: "2026-02-01", status: "paid", paidAmount: 7000, paidDate: "2026-01-28" },
  { id: "r2", tenantId: "t2", tenantName: "Fatima Zahra", unitName: "Apt 102", propertyName: "Résidence Al Firdaws", amount: 6500, dueDate: "2026-02-01", status: "late", paidAmount: 0 },
  { id: "r3", tenantId: "t3", tenantName: "Karim Idrissi", unitName: "Bureau A1", propertyName: "Immeuble Belvédère", amount: 12000, dueDate: "2026-02-01", status: "paid", paidAmount: 12000, paidDate: "2026-02-01" },
  { id: "r4", tenantId: "t4", tenantName: "Sara Alaoui", unitName: "Bureau A2", propertyName: "Immeuble Belvédère", amount: 8000, dueDate: "2026-02-01", status: "partial", paidAmount: 5000, paidDate: "2026-02-05" },
  { id: "r5", tenantId: "t5", tenantName: "Youssef Amrani", unitName: "Apt 1", propertyName: "Résidence Riad Agdal", amount: 5500, dueDate: "2026-02-01", status: "pending", paidAmount: 0 },
  { id: "r6", tenantId: "t6", tenantName: "Nadia Berrada", unitName: "Villa A", propertyName: "Villa Gueliz", amount: 15000, dueDate: "2026-02-01", status: "paid", paidAmount: 15000, paidDate: "2026-01-30" },
  { id: "r7", tenantId: "t1", tenantName: "Ahmed Benali", unitName: "Apt 101", propertyName: "Résidence Al Firdaws", amount: 7000, dueDate: "2026-03-01", status: "pending", paidAmount: 0 },
  { id: "r8", tenantId: "t2", tenantName: "Fatima Zahra", unitName: "Apt 102", propertyName: "Résidence Al Firdaws", amount: 6500, dueDate: "2026-03-01", status: "pending", paidAmount: 0 },
];

export const navItems = [
  { label: "Tableau de bord", icon: LayoutDashboard, path: "/" },
  { label: "Biens", icon: Building2, path: "/properties" },
  { label: "Locataires", icon: Users, path: "/tenants" },
  { label: "Loyers", icon: CreditCard, path: "/rents" },
  { label: "Relances", icon: Bell, path: "/reminders" },
  { label: "Paramètres", icon: Settings, path: "/settings" },
];

export const monthlyRevenue = [
  { month: "Sep", revenue: 180000 },
  { month: "Oct", revenue: 195000 },
  { month: "Nov", revenue: 210000 },
  { month: "Dec", revenue: 198000 },
  { month: "Jan", revenue: 225000 },
  { month: "Fév", revenue: 243000 },
];

export const revenueByCity = [
  { city: "Casablanca", revenue: 120000, fill: "hsl(160, 84%, 39%)" },
  { city: "Rabat", revenue: 35000, fill: "hsl(210, 100%, 52%)" },
  { city: "Marrakech", revenue: 32000, fill: "hsl(38, 92%, 50%)" },
  { city: "Tanger", revenue: 56000, fill: "hsl(280, 65%, 60%)" },
];
