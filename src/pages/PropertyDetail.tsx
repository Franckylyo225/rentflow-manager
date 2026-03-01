import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { properties, units } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Home, Plus, Users, DollarSign, Edit, Eye } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showAddUnit, setShowAddUnit] = useState(false);

  const property = properties.find(p => p.id === id);
  const propertyUnits = units.filter(u => u.propertyId === id);

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Bien introuvable</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>
      </AppLayout>
    );
  }

  const occupied = propertyUnits.filter(u => u.status === "occupied").length;
  const vacant = propertyUnits.filter(u => u.status === "vacant").length;
  const totalRevenue = propertyUnits.filter(u => u.status === "occupied").reduce((s, u) => s + u.rent, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/properties")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{property.name}</h1>
            <p className="text-muted-foreground text-sm">{property.cityName} · {property.address}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="h-3.5 w-3.5" /> Modifier
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total unités" value={propertyUnits.length.toString()} icon={Home} />
          <StatCard title="Occupées" value={occupied.toString()} icon={Users} variant="success" />
          <StatCard title="Vacantes" value={vacant.toString()} icon={Building2} variant="warning" />
          <StatCard title="Revenus mensuels" value={`${(totalRevenue / 1000).toLocaleString()}k`} icon={DollarSign} subtitle="FCFA" />
        </div>

        {/* Units table */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Unités locatives</h2>
          <Button size="sm" className="gap-2" onClick={() => setShowAddUnit(true)}>
            <Plus className="h-3.5 w-3.5" /> Ajouter une unité
          </Button>
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">N° Unité</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Loyer</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Charges</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Statut</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Locataire</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyUnits.map(unit => (
                    <tr key={unit.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-card-foreground">{unit.name}</td>
                      <td className="py-3 px-4 text-right text-card-foreground">{unit.rent.toLocaleString()} FCFA</td>
                      <td className="py-3 px-4 text-right text-muted-foreground hidden sm:table-cell">{unit.charges.toLocaleString()} FCFA</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className={unit.status === "occupied"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-muted text-muted-foreground border-border"
                        }>
                          {unit.status === "occupied" ? "Occupé" : "Vacant"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                        {unit.tenantName || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddUnit} onOpenChange={setShowAddUnit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter une unité</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Numéro unité</Label>
              <Input placeholder="Ex: Apt 301" />
            </div>
            <div className="space-y-2">
              <Label>Loyer mensuel (FCFA)</Label>
              <Input type="number" placeholder="Ex: 350000" />
            </div>
            <div className="space-y-2">
              <Label>Charges (FCFA)</Label>
              <Input type="number" placeholder="Ex: 25000" />
            </div>
            <p className="text-xs text-muted-foreground">Statut par défaut : Vacant</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUnit(false)}>Annuler</Button>
            <Button onClick={() => { toast.success("Unité ajoutée"); setShowAddUnit(false); }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
