import { AppLayout } from "@/components/layout/AppLayout";
import { properties, cities, units } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OccupancyBadge } from "@/components/ui/status-badge";
import { Building2, MapPin, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

export default function Properties() {
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = properties.filter(p => {
    if (cityFilter !== "all" && p.cityId !== cityFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Biens immobiliers</h1>
            <p className="text-muted-foreground text-sm mt-1">{properties.length} biens · {cities.length} villes</p>
          </div>
          <Button className="gap-2 self-start">
            <Plus className="h-4 w-4" /> Ajouter un bien
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Properties grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(property => {
            const propertyUnits = units.filter(u => u.propertyId === property.id);
            const occupancy = property.unitCount > 0 ? Math.round((property.occupiedUnits / property.unitCount) * 100) : 0;

            return (
              <Card key={property.id} className="border-border hover:shadow-lg transition-all duration-200 cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">{property.name}</CardTitle>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {property.cityName} · {property.address}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Occupation</span>
                    <span className="font-semibold text-card-foreground">{occupancy}%</span>
                  </div>
                  <Progress value={occupancy} className="h-2" />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Unités</p>
                      <p className="font-semibold text-card-foreground">{property.occupiedUnits}/{property.unitCount}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Revenus</p>
                      <p className="font-semibold text-card-foreground">{(property.totalRevenue / 1000000).toFixed(1)}M FCFA</p>
                    </div>
                  </div>

                  {/* Units preview */}
                  <div className="space-y-1.5">
                    {propertyUnits.slice(0, 3).map(unit => (
                      <div key={unit.id} className="flex items-center justify-between text-sm py-1">
                        <span className="text-card-foreground">{unit.name}</span>
                        <OccupancyBadge status={unit.status} />
                      </div>
                    ))}
                    {propertyUnits.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{propertyUnits.length - 3} unités supplémentaires</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
