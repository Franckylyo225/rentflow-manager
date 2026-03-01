import { AppLayout } from "@/components/layout/AppLayout";
import { properties, units, cities } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Properties() {
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  const filtered = properties.filter(p => {
    if (cityFilter !== "all" && p.cityId !== cityFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = () => {
    toast.success("Bien créé avec succès");
    setShowAdd(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Biens immobiliers</h1>
            <p className="text-muted-foreground text-sm mt-1">{properties.length} biens · {cities.length} villes</p>
          </div>
          <Button className="gap-2 self-start" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Ajouter un bien
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un bien..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Nom du bien</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Ville</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Unités</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Occupées</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Taux</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Revenus</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(property => {
                    const occupancy = property.unitCount > 0 ? Math.round((property.occupiedUnits / property.unitCount) * 100) : 0;
                    return (
                      <tr
                        key={property.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/properties/${property.id}`)}
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-card-foreground">{property.name}</p>
                          <p className="text-xs text-muted-foreground">{property.address}</p>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{property.cityName}</td>
                        <td className="py-3 px-4 text-center text-card-foreground hidden md:table-cell">{property.unitCount}</td>
                        <td className="py-3 px-4 text-center text-card-foreground hidden md:table-cell">{property.occupiedUnits}</td>
                        <td className="py-3 px-4 text-center hidden lg:table-cell">
                          <span className={`font-medium ${occupancy >= 80 ? "text-success" : occupancy >= 50 ? "text-warning" : "text-destructive"}`}>
                            {occupancy}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-card-foreground">
                          {(property.totalRevenue / 1000).toLocaleString()}k FCFA
                        </td>
                        <td className="py-3 px-4 text-center hidden sm:table-cell">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                            Actif
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un bien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ville</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Sélectionner une ville" /></SelectTrigger>
                <SelectContent>
                  {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom du bien</Label>
              <Input placeholder="Ex: Résidence Les Palmiers" />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input placeholder="Ex: 12 Bd de France, Cocody" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Description du bien..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
