import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users, Shield, Loader2, Crown, UserCog, Calculator, Plus, Trash2, Pencil, Save,
  Eye, Edit3, Gavel, Settings2, MapPin, LayoutDashboard, Home, UserCheck, Banknote, Receipt, BarChart3,
  UserPlus, KeyRound, Link2, Copy, CheckCircle, XCircle, Clock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Permission definitions ─── */
const PERMISSION_GROUPS = [
  {
    label: "Tableau de bord",
    icon: LayoutDashboard,
    permissions: [
      { key: "view_dashboard", label: "Voir le tableau de bord" },
    ],
  },
  {
    label: "Biens immobiliers",
    icon: Home,
    permissions: [
      { key: "view_properties", label: "Voir les biens" },
      { key: "edit_properties", label: "Ajouter / modifier les biens" },
    ],
  },
  {
    label: "Locataires",
    icon: UserCheck,
    permissions: [
      { key: "view_tenants", label: "Voir les locataires" },
      { key: "edit_tenants", label: "Ajouter / modifier les locataires" },
    ],
  },
  {
    label: "Loyers",
    icon: Banknote,
    permissions: [
      { key: "view_rents", label: "Voir les loyers" },
      { key: "edit_rents", label: "Enregistrer des paiements" },
    ],
  },
  {
    label: "Dépenses",
    icon: Receipt,
    permissions: [
      { key: "view_expenses", label: "Voir les dépenses" },
      { key: "edit_expenses", label: "Ajouter / modifier les dépenses" },
    ],
  },
  {
    label: "Contentieux",
    icon: Gavel,
    permissions: [
      { key: "access_litigation", label: "Accéder au contentieux" },
    ],
  },
  {
    label: "Rapports",
    icon: BarChart3,
    permissions: [
      { key: "view_reports", label: "Voir les rapports financiers" },
    ],
  },
  {
    label: "Administration",
    icon: Settings2,
    permissions: [
      { key: "edit_settings", label: "Modifier les paramètres" },
      { key: "manage_users", label: "Gérer les utilisateurs" },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

const BASE_ROLE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  admin: { label: "Admin", icon: Crown, color: "text-primary" },
  gestionnaire: { label: "Gestionnaire", icon: UserCog, color: "text-blue-500" },
  comptable: { label: "Comptable", icon: Calculator, color: "text-amber-500" },
};

interface CustomRole {
  id: string;
  organization_id: string;
  name: string;
  base_role: "admin" | "gestionnaire" | "comptable";
  permissions: string[];
  city_ids: string[];
  is_system: boolean;
}

interface OrgMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: "admin" | "gestionnaire" | "comptable";
  role_id: string;
  custom_role_id: string | null;
  city_ids: string[];
}

interface CityOption {
  id: string;
  name: string;
}

export function UsersRolesTab() {
  const { user } = useAuth();
  const { profile, role: currentRole } = useProfile();
  const isAdmin = currentRole?.role === "admin";

  return (
    <Tabs defaultValue="members" className="space-y-4">
      <TabsList>
        <TabsTrigger value="members" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Membres</TabsTrigger>
        {isAdmin && <TabsTrigger value="pending" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Demandes</TabsTrigger>}
        <TabsTrigger value="roles" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Rôles & Permissions</TabsTrigger>
      </TabsList>

      <TabsContent value="members">
        <MembersSection isAdmin={isAdmin} currentUserId={user?.id} orgId={profile?.organization_id} />
      </TabsContent>
      {isAdmin && (
        <TabsContent value="pending">
          <PendingUsersSection orgId={profile?.organization_id} />
        </TabsContent>
      )}
      <TabsContent value="roles">
        <RolesSection isAdmin={isAdmin} orgId={profile?.organization_id} />
      </TabsContent>
    </Tabs>
  );
}

/* ═══════════════════════════════════════════════════
   MEMBERS SECTION
   ═══════════════════════════════════════════════════ */
function MembersSection({ isAdmin, currentUserId, orgId }: { isAdmin: boolean; currentUserId?: string; orgId?: string }) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<OrgMember | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);

  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [profilesRes, rolesRes, customRolesRes, citiesRes] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, email, phone").eq("organization_id", orgId),
      supabase.from("user_roles").select("id, user_id, role, custom_role_id, city_ids"),
      supabase.from("custom_roles").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("cities").select("id, name").eq("organization_id", orgId).order("name"),
    ]);

    if (customRolesRes.data) setRoles(customRolesRes.data as unknown as CustomRole[]);
    if (citiesRes.data) setCities(citiesRes.data);

    if (profilesRes.data && rolesRes.data) {
      const merged: OrgMember[] = profilesRes.data.map(p => {
        const r = rolesRes.data.find(rl => rl.user_id === p.user_id);
        return {
          ...p,
          role: (r?.role ?? "gestionnaire") as "admin" | "gestionnaire" | "comptable",
          role_id: r?.id || "",
          custom_role_id: (r as any)?.custom_role_id || null,
          city_ids: (r as any)?.city_ids || [],
        };
      });
      setMembers(merged.sort((a, b) => {
        const order = { admin: 0, gestionnaire: 1, comptable: 2 };
        return order[a.role] - order[b.role];
      }));
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAssignRole = async (member: OrgMember, customRoleId: string) => {
    const customRole = roles.find(r => r.id === customRoleId);
    if (!customRole) return;

    setUpdatingId(member.user_id);
    const { error } = await supabase
      .from("user_roles")
      .update({
        role: customRole.base_role as "admin" | "gestionnaire" | "comptable",
        custom_role_id: customRoleId,
      })
      .eq("id", member.role_id);

    if (error) toast.error("Erreur : " + error.message);
    else { toast.success(`Rôle de ${member.full_name} mis à jour`); await fetch(); }
    setUpdatingId(null);
  };

  const handleSaveCities = async (member: OrgMember, cityIds: string[]) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ city_ids: cityIds } as any)
      .eq("id", member.role_id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Restrictions de ville mises à jour"); await fetch(); }
    setEditMember(null);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
              <div>
                <CardTitle className="text-base">Membres de l'équipe</CardTitle>
                <CardDescription>{members.length} utilisateur{members.length > 1 ? "s" : ""}</CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" className="gap-2" onClick={() => setShowAddUser(true)}>
                <UserPlus className="h-4 w-4" /> Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {members.map(member => {
              const isSelf = member.user_id === currentUserId;
              const customRole = roles.find(r => r.id === member.custom_role_id);
              const hasCityRestriction = member.city_ids?.length > 0;

              return (
                <div key={member.user_id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                      {member.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-card-foreground truncate">{member.full_name}</p>
                        {isSelf && <Badge variant="outline" className="text-xs py-0">Vous</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.email || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasCityRestriction && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <MapPin className="h-3 w-3" /> {member.city_ids.length} ville{member.city_ids.length > 1 ? "s" : ""}
                      </Badge>
                    )}

                    {isAdmin && !isSelf ? (
                      <>
                        <Select
                          value={member.custom_role_id || ""}
                          onValueChange={v => handleAssignRole(member, v)}
                          disabled={updatingId === member.user_id}
                        >
                          <SelectTrigger className="w-[170px] h-8 text-xs">
                            {updatingId === member.user_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <SelectValue placeholder={customRole?.name || member.role} />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(r => (
                              <SelectItem key={r.id} value={r.id}>
                                <span className="flex items-center gap-2">
                                  {r.name}
                                  <Badge variant="secondary" className="text-[10px] py-0">{BASE_ROLE_CONFIG[r.base_role]?.label}</Badge>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditMember(member)}>
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {customRole?.name || member.role}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!isAdmin && (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Seuls les administrateurs peuvent modifier les rôles.</p>
          </CardContent>
        </Card>
      )}

      {/* City Restriction Dialog */}
      {editMember && (
        <CityRestrictionDialog
          member={editMember}
          cities={cities}
          onSave={handleSaveCities}
          onClose={() => setEditMember(null)}
        />
      )}

      {showAddUser && orgId && (
        <AddUserDialog
          orgId={orgId}
          roles={roles}
          cities={cities}
          onClose={() => setShowAddUser(false)}
          onCreated={() => { setShowAddUser(false); fetch(); }}
        />
      )}
    </div>
  );
}

/* ─── City Restriction Dialog ─── */
function CityRestrictionDialog({ member, cities, onSave, onClose }: {
  member: OrgMember;
  cities: CityOption[];
  onSave: (member: OrgMember, cityIds: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(member.city_ids || []);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(member, selected);
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Restriction par ville — {member.full_name}</DialogTitle>
          <DialogDescription>
            Sélectionnez les villes auxquelles cet utilisateur a accès. Aucune sélection = accès à toutes les villes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2 max-h-60 overflow-y-auto">
          {cities.map(city => (
            <label key={city.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <Checkbox checked={selected.includes(city.id)} onCheckedChange={() => toggle(city.id)} />
              <span className="text-sm text-card-foreground">{city.name}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Add User Dialog ─── */
function AddUserDialog({ orgId, roles, cities, onClose, onCreated }: {
  orgId: string;
  roles: CustomRole[];
  cities: CityOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(roles.find(r => r.base_role === "gestionnaire")?.id || "");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pwd);
    setShowPassword(true);
  };

  useEffect(() => { generatePassword(); }, []);

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  const handleSubmit = async () => {
    if (!email.trim() || !fullName.trim() || !password.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role: selectedRole?.base_role || "gestionnaire",
          custom_role_id: selectedRoleId || null,
          city_ids: selectedCities,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`Utilisateur ${fullName.trim()} créé avec succès`);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  const toggleCity = (id: string) => {
    setSelectedCities(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Ajouter un utilisateur
          </DialogTitle>
          <DialogDescription>
            Créez un compte avec un mot de passe temporaire. L'utilisateur pourra le modifier après connexion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nom complet *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ex: Jean Kouadio" />
          </div>

          <div className="space-y-2">
            <Label>Adresse email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ex: jean@entreprise.com" />
          </div>

          <div className="space-y-2">
            <Label>Mot de passe temporaire *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={generatePassword} className="gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> Générer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Communiquez ce mot de passe à l'utilisateur de manière sécurisée.</p>
          </div>

          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex items-center gap-2">
                      {r.name}
                      <Badge variant="secondary" className="text-[10px] py-0">{BASE_ROLE_CONFIG[r.base_role]?.label}</Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cities.length > 0 && (
            <div className="space-y-2">
              <Label>Restriction par ville (optionnel)</Label>
              <p className="text-xs text-muted-foreground">Aucune sélection = accès à toutes les villes.</p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {cities.map(city => (
                  <label key={city.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <Checkbox checked={selectedCities.includes(city.id)} onCheckedChange={() => toggleCity(city.id)} />
                    <span className="text-sm text-card-foreground">{city.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving || !email.trim() || !fullName.trim() || !password.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Créer l'utilisateur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════
   ROLES SECTION
   ═══════════════════════════════════════════════════ */
function RolesSection({ isAdmin, orgId }: { isAdmin: boolean; orgId?: string }) {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState<CustomRole | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase.from("custom_roles").select("*").eq("organization_id", orgId).order("is_system", { ascending: false }).order("name");
    if (data) setRoles(data as unknown as CustomRole[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleDelete = async (role: CustomRole) => {
    if (role.is_system) { toast.error("Impossible de supprimer un rôle système"); return; }
    const { error } = await supabase.from("custom_roles").delete().eq("id", role.id);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success("Rôle supprimé"); await fetchRoles(); }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Nouveau rôle
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {roles.map(role => {
          const baseCfg = BASE_ROLE_CONFIG[role.base_role];
          return (
            <Card key={role.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <baseCfg.icon className={`h-4 w-4 ${baseCfg.color}`} />
                    <CardTitle className="text-sm">{role.name}</CardTitle>
                    {role.is_system && <Badge variant="secondary" className="text-[10px]">Système</Badge>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRole(role)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      {!role.is_system && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(role)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Rôle de base : {baseCfg.label} · {role.permissions.length} permission{role.permissions.length > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map(p => {
                    const pDef = PERMISSION_GROUPS.flatMap(g => g.permissions).find(pp => pp.key === p);
                    return (
                      <Badge key={p} variant="outline" className="text-[10px] font-normal">
                        {pDef?.label || p}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(showCreate || editRole) && (
        <RoleEditorDialog
          role={editRole}
          orgId={orgId!}
          onClose={() => { setShowCreate(false); setEditRole(null); }}
          onSaved={() => { setShowCreate(false); setEditRole(null); fetchRoles(); }}
        />
      )}
    </div>
  );
}

/* ─── Role Editor Dialog ─── */
function RoleEditorDialog({ role, orgId, onClose, onSaved }: {
  role: CustomRole | null;
  orgId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!role;
  const [name, setName] = useState(role?.name || "");
  const [baseRole, setBaseRole] = useState<string>(role?.base_role || "gestionnaire");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions || []);
  const [saving, setSaving] = useState(false);

  const togglePerm = (key: string) => {
    setPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const toggleGroup = (group: typeof PERMISSION_GROUPS[0]) => {
    const keys = group.permissions.map(p => p.key);
    const allChecked = keys.every(k => permissions.includes(k));
    if (allChecked) {
      setPermissions(prev => prev.filter(p => !keys.includes(p)));
    } else {
      setPermissions(prev => [...new Set([...prev, ...keys])]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    if (isEdit) {
      const updates: any = { name: name.trim(), permissions };
      if (!role!.is_system) updates.base_role = baseRole;
      const { error } = await supabase.from("custom_roles").update(updates).eq("id", role!.id);
      if (error) { toast.error("Erreur : " + error.message); setSaving(false); return; }
      toast.success("Rôle mis à jour");
    } else {
      const { error } = await supabase.from("custom_roles").insert({
        organization_id: orgId,
        name: name.trim(),
        base_role: baseRole as "admin" | "gestionnaire" | "comptable",
        permissions,
        is_system: false,
      });
      if (error) { toast.error("Erreur : " + error.message); setSaving(false); return; }
      toast.success("Rôle créé");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le rôle" : "Nouveau rôle personnalisé"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Modifiez les permissions de ce rôle." : "Créez un rôle avec des permissions spécifiques."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du rôle *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Agent terrain" disabled={role?.is_system} />
            </div>
            <div className="space-y-2">
              <Label>Rôle de base (accès RLS)</Label>
              <Select value={baseRole} onValueChange={setBaseRole} disabled={role?.is_system}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                  <SelectItem value="comptable">Comptable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Permissions</Label>
            <div className="space-y-3">
              {PERMISSION_GROUPS.map(group => {
                const keys = group.permissions.map(p => p.key);
                const allChecked = keys.every(k => permissions.includes(k));
                const someChecked = keys.some(k => permissions.includes(k));

                return (
                  <div key={group.label} className="rounded-lg border border-border p-3">
                    <label className="flex items-center gap-2.5 cursor-pointer mb-2">
                      <Checkbox
                        checked={allChecked}
                        // @ts-ignore
                        indeterminate={someChecked && !allChecked}
                        onCheckedChange={() => toggleGroup(group)}
                      />
                      <group.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-card-foreground">{group.label}</span>
                    </label>
                    <div className="ml-7 space-y-1.5">
                      {group.permissions.map(perm => (
                        <label key={perm.key} className="flex items-center gap-2.5 cursor-pointer">
                          <Checkbox
                            checked={permissions.includes(perm.key)}
                            onCheckedChange={() => togglePerm(perm.key)}
                          />
                          <span className="text-sm text-muted-foreground">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
