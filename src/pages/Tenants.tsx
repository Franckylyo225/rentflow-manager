import { AppLayout } from "@/components/layout/AppLayout";
import { tenants } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Phone, Mail, MapPin, Calendar } from "lucide-react";
import { useState } from "react";

export default function Tenants() {
  const [search, setSearch] = useState("");

  const filtered = tenants.filter(t =>
    !search || t.fullName.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Locataires</h1>
            <p className="text-muted-foreground text-sm mt-1">{tenants.length} locataires actifs</p>
          </div>
          <Button className="gap-2 self-start">
            <Plus className="h-4 w-4" /> Ajouter un locataire
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un locataire..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(tenant => (
            <Card key={tenant.id} className="border-border hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {tenant.fullName.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-card-foreground truncate">{tenant.fullName}</p>
                    <p className="text-sm text-muted-foreground truncate">{tenant.propertyName} · {tenant.unitName}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{tenant.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{tenant.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{tenant.cityName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Bail : {new Date(tenant.leaseStart).toLocaleDateString("fr-FR")} · {tenant.leaseDuration} mois</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <div className="flex-1 p-2.5 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground">Loyer</p>
                    <p className="font-semibold text-sm text-card-foreground">{tenant.rent.toLocaleString()} FCFA</p>
                  </div>
                  <div className="flex-1 p-2.5 rounded-lg bg-muted text-center">
                    <p className="text-xs text-muted-foreground">Caution</p>
                    <p className="font-semibold text-sm text-card-foreground">{tenant.deposit.toLocaleString()} FCFA</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
