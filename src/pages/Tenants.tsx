import { AppLayout } from "@/components/layout/AppLayout";
import { useProperties, useUnits, useRentPayments } from "@/hooks/useData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Loader2, ShieldAlert, UserX } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeTenantRiskScore, riskStyles, riskProgressColors, type TenantRiskScore } from "@/lib/riskScoring";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const REASON_LABELS: Record<string, string> = {
  normal: "Fin normale",
  anticipee_locataire: "Résiliation locataire",
  anticipee_proprietaire: "Résiliation propriétaire",
  impaye: "Impayé / contentieux",
};

export default function Tenants() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [sortByRisk, setSortByRisk] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [form, setForm] = useState({
    unit_id: "", full_name: "", phone: "", email: "", id_number: "",
    lease_start: new Date().toISOString().split("T")[0], lease_duration: "12", deposit: "",
    tenant_type: "individual" as "individual" | "company",
    company_name: "", contact_person: "", rccm: "",
  });
  const [formerSearch, setFormerSearch] = useState("");
  const [formerTenants, setFormerTenants] = useState<any[]>([]);
  const [formerLoading, setFormerLoading] = useState(false);
  const [terminations, setTerminations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("active");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowAdd(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  // Active tenants hook
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveTenants = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("*, units(name, property_id, properties(name, city_id, cities(name)))")
      .eq("is_active", true)
      .order("full_name");
    setTenants((data as any) || []);
    setLoading(false);
  };

  const fetchFormerTenants = async () => {
    if (!user) return;
    setFormerLoading(true);
    const [tRes, bRes] = await Promise.all([
      supabase
        .from("tenants")
        .select("*, units(name, property_id, properties(name, city_id, cities(name)))")
        .eq("is_active", false)
        .order("updated_at", { ascending: false }),
      supabase
        .from("bail_terminations")
        .select("*")
        .eq("status", "closed")
        .order("closed_at", { ascending: false }),
    ]);
    setFormerTenants((tRes.data as any) || []);
    setTerminations((bRes.data as any) || []);
    setFormerLoading(false);
  };

  useEffect(() => { fetchActiveTenants(); }, [user]);
  useEffect(() => { if (activeTab === "former") fetchFormerTenants(); }, [activeTab, user]);

  const refetch = () => { fetchActiveTenants(); };

  const { data: properties } = useProperties();
  const { data: allUnits } = useUnits();
  const { data: allPayments } = useRentPayments();

  const riskScores = useMemo(() => {
    const map = new Map<string, TenantRiskScore>();
    tenants.forEach(t => map.set(t.id, computeTenantRiskScore(t.id, allPayments)));
    return map;
  }, [tenants, allPayments]);

  const vacantUnits = allUnits.filter(u => u.status === "vacant");
  const filteredVacantUnits = selectedProperty
    ? vacantUnits.filter(u => u.property_id === selectedProperty)
    : vacantUnits;

  const cities = useMemo(() => {
    const cityMap = new Map<string, string>();
    properties.forEach(p => {
      const cityName = (p as any).cities?.name;
      const cityId = p.city_id;
      if (cityId && cityName) cityMap.set(cityId, cityName);
    });
    return Array.from(cityMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [properties]);

  const filteredProperties = useMemo(() => {
    if (cityFilter === "all") return properties;
    return properties.filter(p => p.city_id === cityFilter);
  }, [properties, cityFilter]);

  const filtered = useMemo(() => {
    let result = tenants.filter(t =>
      !search || t.full_name.toLowerCase().includes(search.toLowerCase()) || t.phone.includes(search)
    );
    if (cityFilter !== "all") {
      const propertyIdsInCity = properties.filter(p => p.city_id === cityFilter).map(p => p.id);
      const unitIdsInCity = allUnits.filter(u => propertyIdsInCity.includes(u.property_id)).map(u => u.id);
      result = result.filter(t => unitIdsInCity.includes(t.unit_id));
    }
    if (propertyFilter !== "all") {
      const unitIdsInProperty = allUnits.filter(u => u.property_id === propertyFilter).map(u => u.id);
      result = result.filter(t => unitIdsInProperty.includes(t.unit_id));
    }
    if (riskFilter !== "all") {
      result = result.filter(t => riskScores.get(t.id)?.level === riskFilter);
    }
    if (sortByRisk) {
      result = [...result].sort((a, b) => (riskScores.get(b.id)?.score ?? 0) - (riskScores.get(a.id)?.score ?? 0));
    }
    return result;
  }, [tenants, search, cityFilter, propertyFilter, riskFilter, sortByRisk, riskScores, properties, allUnits]);

  const filteredFormer = useMemo(() => {
    if (!formerSearch) return formerTenants;
    return formerTenants.filter(t =>
      t.full_name.toLowerCase().includes(formerSearch.toLowerCase()) || t.phone.includes(formerSearch)
    );
  }, [formerTenants, formerSearch]);

  const terminationMap = useMemo(() => {
    const map = new Map<string, any>();
    terminations.forEach(t => map.set(t.tenant_id, t));
    return map;
  }, [terminations]);

  const selectedUnit = allUnits.find(u => u.id === form.unit_id);

  const handleSave = async () => {
    if (!form.unit_id || !form.full_name) return;
    setSaving(true);
    const unit = allUnits.find(u => u.id === form.unit_id);
    if (!unit) { setSaving(false); return; }
    const insertData: any = {
      unit_id: form.unit_id, full_name: form.full_name, phone: form.phone,
      email: form.email, id_number: form.id_number, lease_start: form.lease_start,
      lease_duration: parseInt(form.lease_duration) || 12, rent: unit.rent,
      deposit: parseInt(form.deposit) || unit.rent * 2,
      tenant_type: form.tenant_type,
    };
    if (form.tenant_type === "company") {
      insertData.company_name = form.company_name;
      insertData.contact_person = form.contact_person;
      insertData.rccm = form.rccm;
    }
    const { error: tenantError } = await supabase.from("tenants").insert(insertData);
    if (tenantError) { toast.error("Erreur : " + tenantError.message); setSaving(false); return; }
    await supabase.from("units").update({ status: "occupied" as const }).eq("id", form.unit_id);
    toast.success("Locataire ajouté et unité mise à jour");
    setShowAdd(false);
    setForm({ unit_id: "", full_name: "", phone: "", email: "", id_number: "", lease_start: new Date().toISOString().split("T")[0], lease_duration: "12", deposit: "", tenant_type: "individual", company_name: "", contact_person: "", rccm: "" });
    setSelectedProperty("");
    setSaving(false);
    refetch();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Locataires</h1>
            <p className="text-muted-foreground text-sm mt-1">{tenants.length} actifs · {formerTenants.length > 0 ? `${formerTenants.length} anciens` : ""}</p>
          </div>
          <Button className="gap-2 self-start" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Ajouter un locataire
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">Locataires actifs</TabsTrigger>
            <TabsTrigger value="former" className="gap-1.5">
              <UserX className="h-3.5 w-3.5" /> Anciens locataires
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher par nom ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPropertyFilter("all"); }}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Bien" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les biens</SelectItem>
                    {filteredProperties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Risque" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les niveaux</SelectItem>
                    <SelectItem value="low">🟢 Faible</SelectItem>
                    <SelectItem value="medium">🟡 Modéré</SelectItem>
                    <SelectItem value="high">🟠 Élevé</SelectItem>
                    <SelectItem value="critical">🔴 Critique</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant={sortByRisk ? "default" : "outline"} size="sm" className="gap-1.5 self-start" onClick={() => setSortByRisk(v => !v)}>
                  <ShieldAlert className="h-4 w-4" />
                  {sortByRisk ? "Trié par risque" : "Trier par risque"}
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  {tenants.length === 0 ? "Aucun locataire. Ajoutez d'abord un bien et des unités." : "Aucun résultat."}
                </div>
              ) : (
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
                            <th className="text-center py-3 px-4 text-muted-foreground font-medium">
                              <span className="flex items-center justify-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Risque</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(tenant => (
                            <tr key={tenant.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/tenants/${tenant.id}`)}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                    {tenant.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                  </div>
                                  <span className="font-medium text-card-foreground">{tenant.full_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{tenant.phone}</td>
                              <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{tenant.units?.properties?.name}</td>
                              <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{tenant.units?.name}</td>
                              <td className="py-3 px-4 text-right text-card-foreground hidden lg:table-cell">{tenant.rent.toLocaleString()} FCFA</td>
                              <td className="py-3 px-4 text-center">
                                {(() => {
                                  const risk = riskScores.get(tenant.id);
                                  if (!risk) return null;
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="inline-flex flex-col items-center gap-1">
                                          <Badge variant="outline" className={cn("text-xs font-medium", riskStyles[risk.level])}>
                                            {risk.score}/100
                                          </Badge>
                                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div className={cn("h-full rounded-full transition-all", riskProgressColors[risk.level])} style={{ width: `${risk.score}%` }} />
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="text-xs max-w-48">
                                        <p className="font-semibold mb-1">Risque : {risk.label}</p>
                                        <p>Retards : {risk.lateCount}/{risk.totalPayments} échéances</p>
                                        <p>Moy. retard : {risk.avgDaysLate}j</p>
                                        <p>Impayés : {risk.unpaidAmount.toLocaleString()} FCFA</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="former">
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un ancien locataire..." value={formerSearch} onChange={e => setFormerSearch(e.target.value)} className="pl-9" />
              </div>

              {formerLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : filteredFormer.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">Aucun ancien locataire.</div>
              ) : (
                <Card className="border-border">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Nom</th>
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Téléphone</th>
                            <th className="text-left py-3 px-4 text-muted-foreground font-medium hidden md:table-cell">Bien / Unité</th>
                            <th className="text-center py-3 px-4 text-muted-foreground font-medium">Motif</th>
                            <th className="text-center py-3 px-4 text-muted-foreground font-medium hidden sm:table-cell">Date clôture</th>
                            <th className="text-right py-3 px-4 text-muted-foreground font-medium hidden lg:table-cell">Solde</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredFormer.map(tenant => {
                            const term = terminationMap.get(tenant.id);
                            return (
                              <tr key={tenant.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/tenants/${tenant.id}`)}>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                                      {tenant.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                    </div>
                                    <span className="font-medium text-card-foreground">{tenant.full_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{tenant.phone}</td>
                                <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                                  {tenant.units?.properties?.name} · {tenant.units?.name}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {term ? (
                                    <Badge variant="outline" className="text-xs">
                                      {REASON_LABELS[term.reason] || term.reason}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center text-muted-foreground hidden sm:table-cell">
                                  {term?.closed_at ? new Date(term.closed_at).toLocaleDateString("fr-FR") : "—"}
                                </td>
                                <td className="py-3 px-4 text-right hidden lg:table-cell">
                                  {term ? (
                                    <span className={cn("font-medium", term.balance >= 0 ? "text-green-600" : "text-destructive")}>
                                      {term.balance >= 0 ? "+" : ""}{term.balance.toLocaleString()} FCFA
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un locataire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Bien immobilier</Label>
              <Select value={selectedProperty} onValueChange={v => { setSelectedProperty(v); setForm(f => ({ ...f, unit_id: "" })); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.cities?.name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unité vacante</Label>
              <Select value={form.unit_id} onValueChange={v => setForm(f => ({ ...f, unit_id: v }))}>
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
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ex: Kouadio Jean" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 07 XX XX XX XX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
              </div>
              <div className="space-y-2">
                <Label>Pièce d'identité</Label>
                <Input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} placeholder="CI-XXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date début bail</Label>
                <Input type="date" value={form.lease_start} onChange={e => setForm(f => ({ ...f, lease_start: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Durée (mois)</Label>
                <Input type="number" value={form.lease_duration} onChange={e => setForm(f => ({ ...f, lease_duration: e.target.value }))} placeholder="12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dépôt de garantie (FCFA)</Label>
              <Input type="number" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))} placeholder={selectedUnit ? (selectedUnit.rent * 2).toString() : "Ex: 700000"} />
            </div>
            <div className="p-3 rounded-lg bg-accent/30 text-xs text-accent-foreground">
              <strong>Règle métier :</strong> Dès validation, l'unité passera en statut "Occupé".
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.unit_id || !form.full_name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
