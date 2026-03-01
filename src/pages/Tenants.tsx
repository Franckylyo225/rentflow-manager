import { AppLayout } from "@/components/layout/AppLayout";
import { tenants, rentPayments, properties, units, cities } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Tenants() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState("");
  const navigate = useNavigate();

  const filtered = tenants.filter(t =>
    !search || t.fullName.toLowerCase().includes(search.toLowerCase()) || t.phone.includes(search)
  );

  const vacantUnits = units.filter(u => u.status === "vacant");
  const filteredVacantUnits = selectedProperty
    ? vacantUnits.filter(u => u.propertyId === selectedProperty)
    : vacantUnits;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Locataires</h1>
            <p className="text-muted-foreground text-sm mt-1">{tenants.length} locataires actifs</p>
          </div>
          <Button className="gap-2 self-start" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Ajouter un locataire
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Nom</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Téléphone</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Bien</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Unité</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Loyer</th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">Paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tenant => (
                    <tr
                      key={tenant.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/tenants/${tenant.id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {tenant.fullName.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className="font-medium text-card-foreground">{tenant.fullName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{tenant.phone}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{tenant.propertyName}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{tenant.unitName}</td>
                      <td className="py-3 px-4 text-right text-card-foreground hidden lg:table-cell">{tenant.rent.toLocaleString()} FCFA</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className={
                          tenant.paymentStatus === "up_to_date"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }>
                          {tenant.paymentStatus === "up_to_date" ? "À jour" : "En retard"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un locataire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Bien immobilier</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.cityName})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unité vacante</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Sélectionner une unité" /></SelectTrigger>
                <SelectContent>
                  {filteredVacantUnits.length === 0 && <SelectItem value="none" disabled>Aucune unité vacante</SelectItem>}
                  {filteredVacantUnits.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} — {u.rent.toLocaleString()} FCFA</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input placeholder="Ex: Kouadio Jean" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input placeholder="+225 07 XX XX XX XX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@exemple.com" />
              </div>
              <div className="space-y-2">
                <Label>Pièce d'identité</Label>
                <Input placeholder="CI-XXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date début bail</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Durée (mois)</Label>
                <Input type="number" placeholder="12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dépôt de garantie (FCFA)</Label>
              <Input type="number" placeholder="Ex: 700000" />
            </div>
            <div className="p-3 rounded-lg bg-accent/30 text-xs text-accent-foreground">
              <strong>Règle métier :</strong> Dès validation, l'unité passera en statut "Occupé" et le calendrier des loyers sera généré automatiquement.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={() => { toast.success("Locataire ajouté et loyers générés"); setShowAdd(false); }}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
