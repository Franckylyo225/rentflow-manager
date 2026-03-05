import { Building2, Users, CreditCard, LayoutDashboard, Settings, Receipt, Users2, BarChart3, Bell, Landmark } from "lucide-react";

export interface City {
  id: string;
  name: string;
  propertyCount: number;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  description?: string;
  cityId: string;
  cityName: string;
  unitCount: number;
  occupiedUnits: number;
  totalRevenue: number;
  status: "active" | "inactive";
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
  leaseDuration: number;
  rent: number;
  deposit: number;
  unitId: string;
  unitName: string;
  propertyId: string;
  propertyName: string;
  cityName: string;
  paymentStatus: "up_to_date" | "late";
}

export interface RentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  unitName: string;
  propertyId: string;
  propertyName: string;
  cityName: string;
  amount: number;
  dueDate: string;
  status: "paid" | "late" | "partial" | "pending";
  paidAmount: number;
  paidDate?: string;
  paymentMethod?: string;
  comment?: string;
  month: string;
}

export interface PaymentRecord {
  id: string;
  rentPaymentId: string;
  amount: number;
  date: string;
  method: string;
  comment?: string;
}

export const cities: City[] = [
  { id: "c1", name: "Abidjan", propertyCount: 5 },
  { id: "c2", name: "Bouaké", propertyCount: 3 },
  { id: "c3", name: "Yamoussoukro", propertyCount: 2 },
  { id: "c4", name: "San-Pédro", propertyCount: 2 },
];

export const properties: Property[] = [
  { id: "p1", name: "Résidence Cocody", address: "12 Bd de France, Cocody", description: "Résidence moderne avec parking sécurisé", cityId: "c1", cityName: "Abidjan", unitCount: 8, occupiedUnits: 6, totalRevenue: 2100000, status: "active" },
  { id: "p2", name: "Immeuble Plateau", address: "45 Av Terrasson de Fougères", description: "Immeuble de bureaux au cœur du Plateau", cityId: "c1", cityName: "Abidjan", unitCount: 12, occupiedUnits: 10, totalRevenue: 3900000, status: "active" },
  { id: "p3", name: "Résidence Kossou", address: "8 Rue des Jardins", description: "Résidence calme proche du marché", cityId: "c2", cityName: "Bouaké", unitCount: 6, occupiedUnits: 5, totalRevenue: 1750000, status: "active" },
  { id: "p4", name: "Villa Présidentielle", address: "23 Bd de la Paix", description: "Villa haut standing", cityId: "c3", cityName: "Yamoussoukro", unitCount: 4, occupiedUnits: 4, totalRevenue: 1600000, status: "active" },
  { id: "p5", name: "Résidence Port", address: "67 Rue du Port", description: "Résidence proche du port autonome", cityId: "c4", cityName: "San-Pédro", unitCount: 10, occupiedUnits: 7, totalRevenue: 2800000, status: "active" },
];

export const units: Unit[] = [
  { id: "u1", propertyId: "p1", propertyName: "Résidence Cocody", name: "Apt 101", rent: 350000, charges: 25000, status: "occupied", tenantId: "t1", tenantName: "Kouassi Yao" },
  { id: "u2", propertyId: "p1", propertyName: "Résidence Cocody", name: "Apt 102", rent: 300000, charges: 25000, status: "occupied", tenantId: "t2", tenantName: "Aminata Koné" },
  { id: "u3", propertyId: "p1", propertyName: "Résidence Cocody", name: "Apt 201", rent: 400000, charges: 30000, status: "vacant" },
  { id: "u4", propertyId: "p1", propertyName: "Résidence Cocody", name: "Apt 202", rent: 350000, charges: 25000, status: "vacant" },
  { id: "u5", propertyId: "p2", propertyName: "Immeuble Plateau", name: "Bureau A1", rent: 600000, charges: 50000, status: "occupied", tenantId: "t3", tenantName: "Jean-Marc Aké" },
  { id: "u6", propertyId: "p2", propertyName: "Immeuble Plateau", name: "Bureau A2", rent: 450000, charges: 40000, status: "occupied", tenantId: "t4", tenantName: "Fatou Diallo" },
  { id: "u7", propertyId: "p2", propertyName: "Immeuble Plateau", name: "Bureau B1", rent: 500000, charges: 45000, status: "occupied" },
  { id: "u8", propertyId: "p2", propertyName: "Immeuble Plateau", name: "Bureau B2", rent: 550000, charges: 45000, status: "vacant" },
  { id: "u9", propertyId: "p3", propertyName: "Résidence Kossou", name: "Apt 1", rent: 200000, charges: 15000, status: "occupied", tenantId: "t5", tenantName: "Moussa Touré" },
  { id: "u10", propertyId: "p3", propertyName: "Résidence Kossou", name: "Apt 2", rent: 180000, charges: 15000, status: "occupied" },
  { id: "u11", propertyId: "p4", propertyName: "Villa Présidentielle", name: "Villa A", rent: 750000, charges: 60000, status: "occupied", tenantId: "t6", tenantName: "Marie-Claire N'Guessan" },
  { id: "u12", propertyId: "p5", propertyName: "Résidence Port", name: "Apt 301", rent: 500000, charges: 35000, status: "vacant" },
  { id: "u13", propertyId: "p5", propertyName: "Résidence Port", name: "Apt 302", rent: 480000, charges: 35000, status: "occupied" },
];

export const tenants: Tenant[] = [
  { id: "t1", fullName: "Kouassi Yao", phone: "+225 07 12 34 56 78", email: "kouassi.yao@email.com", idNumber: "CI-1234567", leaseStart: "2024-01-15", leaseDuration: 12, rent: 350000, deposit: 700000, unitId: "u1", unitName: "Apt 101", propertyId: "p1", propertyName: "Résidence Cocody", cityName: "Abidjan", paymentStatus: "up_to_date" },
  { id: "t2", fullName: "Aminata Koné", phone: "+225 05 23 45 67 89", email: "aminata.kone@email.com", idNumber: "CI-7890123", leaseStart: "2024-03-01", leaseDuration: 24, rent: 300000, deposit: 600000, unitId: "u2", unitName: "Apt 102", propertyId: "p1", propertyName: "Résidence Cocody", cityName: "Abidjan", paymentStatus: "late" },
  { id: "t3", fullName: "Jean-Marc Aké", phone: "+225 01 34 56 78 90", email: "jm.ake@email.com", idNumber: "CI-3456789", leaseStart: "2023-09-01", leaseDuration: 36, rent: 600000, deposit: 1200000, unitId: "u5", unitName: "Bureau A1", propertyId: "p2", propertyName: "Immeuble Plateau", cityName: "Abidjan", paymentStatus: "up_to_date" },
  { id: "t4", fullName: "Fatou Diallo", phone: "+225 07 45 67 89 01", email: "fatou.diallo@email.com", idNumber: "CI-9012345", leaseStart: "2024-06-15", leaseDuration: 12, rent: 450000, deposit: 900000, unitId: "u6", unitName: "Bureau A2", propertyId: "p2", propertyName: "Immeuble Plateau", cityName: "Abidjan", paymentStatus: "late" },
  { id: "t5", fullName: "Moussa Touré", phone: "+225 05 56 78 90 12", email: "moussa.toure@email.com", idNumber: "CI-5678901", leaseStart: "2024-02-01", leaseDuration: 12, rent: 200000, deposit: 400000, unitId: "u9", unitName: "Apt 1", propertyId: "p3", propertyName: "Résidence Kossou", cityName: "Bouaké", paymentStatus: "up_to_date" },
  { id: "t6", fullName: "Marie-Claire N'Guessan", phone: "+225 01 67 89 01 23", email: "mc.nguessan@email.com", idNumber: "CI-6789012", leaseStart: "2024-04-01", leaseDuration: 24, rent: 750000, deposit: 1500000, unitId: "u11", unitName: "Villa A", propertyId: "p4", propertyName: "Villa Présidentielle", cityName: "Yamoussoukro", paymentStatus: "up_to_date" },
];

export const rentPayments: RentPayment[] = [
  { id: "r1", tenantId: "t1", tenantName: "Kouassi Yao", unitName: "Apt 101", propertyId: "p1", propertyName: "Résidence Cocody", cityName: "Abidjan", amount: 350000, dueDate: "2026-02-01", status: "paid", paidAmount: 350000, paidDate: "2026-01-28", paymentMethod: "Virement", month: "2026-02" },
  { id: "r2", tenantId: "t2", tenantName: "Aminata Koné", unitName: "Apt 102", propertyId: "p1", propertyName: "Résidence Cocody", cityName: "Abidjan", amount: 300000, dueDate: "2026-02-01", status: "late", paidAmount: 0, month: "2026-02" },
  { id: "r3", tenantId: "t3", tenantName: "Jean-Marc Aké", unitName: "Bureau A1", propertyId: "p2", propertyName: "Immeuble Plateau", cityName: "Abidjan", amount: 600000, dueDate: "2026-02-01", status: "paid", paidAmount: 600000, paidDate: "2026-02-01", paymentMethod: "Chèque", month: "2026-02" },
  { id: "r4", tenantId: "t4", tenantName: "Fatou Diallo", unitName: "Bureau A2", propertyId: "p2", propertyName: "Immeuble Plateau", cityName: "Abidjan", amount: 450000, dueDate: "2026-02-01", status: "partial", paidAmount: 250000, paidDate: "2026-02-05", paymentMethod: "Espèces", month: "2026-02" },
  { id: "r5", tenantId: "t5", tenantName: "Moussa Touré", unitName: "Apt 1", propertyId: "p3", propertyName: "Résidence Kossou", cityName: "Bouaké", amount: 200000, dueDate: "2026-02-01", status: "pending", paidAmount: 0, month: "2026-02" },
  { id: "r6", tenantId: "t6", tenantName: "Marie-Claire N'Guessan", unitName: "Villa A", propertyId: "p4", propertyName: "Villa Présidentielle", cityName: "Yamoussoukro", amount: 750000, dueDate: "2026-02-01", status: "paid", paidAmount: 750000, paidDate: "2026-01-30", paymentMethod: "Mobile Money", month: "2026-02" },
  { id: "r7", tenantId: "t1", tenantName: "Kouassi Yao", unitName: "Apt 101", propertyId: "p1", propertyName: "Résidence Cocody", cityName: "Abidjan", amount: 350000, dueDate: "2026-03-01", status: "pending", paidAmount: 0, month: "2026-03" },
  { id: "r8", tenantId: "t2", tenantName: "Aminata Koné", unitName: "Apt 102", propertyId: "p1", propertyName: "Résidence Cocody", cityName: "Abidjan", amount: 300000, dueDate: "2026-03-01", status: "pending", paidAmount: 0, month: "2026-03" },
  { id: "r9", tenantId: "t3", tenantName: "Jean-Marc Aké", unitName: "Bureau A1", propertyId: "p2", propertyName: "Immeuble Plateau", cityName: "Abidjan", amount: 600000, dueDate: "2026-03-01", status: "pending", paidAmount: 0, month: "2026-03" },
  { id: "r10", tenantId: "t4", tenantName: "Fatou Diallo", unitName: "Bureau A2", propertyId: "p2", propertyName: "Immeuble Plateau", cityName: "Abidjan", amount: 450000, dueDate: "2026-03-01", status: "pending", paidAmount: 0, month: "2026-03" },
  { id: "r11", tenantId: "t5", tenantName: "Moussa Touré", unitName: "Apt 1", propertyId: "p3", propertyName: "Résidence Kossou", cityName: "Bouaké", amount: 200000, dueDate: "2026-03-01", status: "pending", paidAmount: 0, month: "2026-03" },
  { id: "r12", tenantId: "t6", tenantName: "Marie-Claire N'Guessan", unitName: "Villa A", propertyId: "p4", propertyName: "Villa Présidentielle", cityName: "Yamoussoukro", amount: 750000, dueDate: "2026-03-01", status: "pending", paidAmount: 0, month: "2026-03" },
];

export const navItems = [
  { label: "Tableau de bord", icon: LayoutDashboard, path: "/" },
  { label: "Biens", icon: Building2, path: "/properties" },
  { label: "Locataires", icon: Users, path: "/tenants" },
  { label: "Loyers", icon: CreditCard, path: "/rents" },
  { label: "Dépenses", icon: Receipt, path: "/expenses" },
  { label: "Salaires", icon: Users2, path: "/employees" },
  { label: "Rapports", icon: BarChart3, path: "/financial-reports" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Paramètres", icon: Settings, path: "/settings" },
];

export const monthlyRevenue = [
  { month: "Sep", revenue: 9000000, paid: 7500000, late: 1500000 },
  { month: "Oct", revenue: 9750000, paid: 8200000, late: 1550000 },
  { month: "Nov", revenue: 10500000, paid: 9100000, late: 1400000 },
  { month: "Dec", revenue: 9900000, paid: 8800000, late: 1100000 },
  { month: "Jan", revenue: 11250000, paid: 10000000, late: 1250000 },
  { month: "Fév", revenue: 12150000, paid: 10450000, late: 1700000 },
];

export const revenueByCity = [
  { city: "Abidjan", revenue: 6000000, fill: "hsl(160, 84%, 39%)" },
  { city: "Bouaké", revenue: 1750000, fill: "hsl(210, 100%, 52%)" },
  { city: "Yamoussoukro", revenue: 1600000, fill: "hsl(38, 92%, 50%)" },
  { city: "San-Pédro", revenue: 2800000, fill: "hsl(280, 65%, 60%)" },
];

export const paymentMethods = [
  "Espèces",
  "Virement bancaire",
  "Chèque",
  "Mobile Money",
  "Carte bancaire",
];

export const months = [
  { value: "2026-03", label: "Mars 2026" },
  { value: "2026-02", label: "Février 2026" },
  { value: "2026-01", label: "Janvier 2026" },
  { value: "2025-12", label: "Décembre 2025" },
];
