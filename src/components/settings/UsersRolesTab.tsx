import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shield, Loader2, Crown, UserCog, Calculator } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";

interface OrgMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "gestionnaire" | "comptable";
  role_id: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; description: string }> = {
  admin: { label: "Administrateur", icon: Crown, color: "bg-primary/10 text-primary", description: "Accès complet à la plateforme" },
  gestionnaire: { label: "Gestionnaire", icon: UserCog, color: "bg-info/10 text-info", description: "Gestion des biens et locataires" },
  comptable: { label: "Comptable", icon: Calculator, color: "bg-warning/10 text-warning", description: "Accès loyers et rapports" },
};

export function UsersRolesTab() {
  const { user } = useAuth();
  const { profile, role: currentRole } = useProfile();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = currentRole?.role === "admin";

  useEffect(() => {
    if (!profile?.organization_id) return;
    fetchMembers();
  }, [profile?.organization_id]);

  const fetchMembers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email, phone")
      .eq("organization_id", profile!.organization_id);

    if (!profiles) { setLoading(false); return; }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("id, user_id, role");

    const merged: OrgMember[] = profiles.map(p => {
      const r = roles?.find(rl => rl.user_id === p.user_id);
      return {
        ...p,
        role: (r?.role ?? "gestionnaire") as "admin" | "gestionnaire" | "comptable",
        role_id: r?.id || "",
      };
    });

    setMembers(merged.sort((a, b) => {
      const order = { admin: 0, gestionnaire: 1, comptable: 2 };
      return order[a.role] - order[b.role];
    }));
    setLoading(false);
  };

  const handleRoleChange = async (member: OrgMember, newRole: string) => {
    if (member.user_id === user?.id) {
      toast.error("Vous ne pouvez pas modifier votre propre rôle");
      return;
    }
    setUpdatingId(member.user_id);
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as "admin" | "gestionnaire" | "comptable" })
      .eq("id", member.role_id);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(`Rôle de ${member.full_name} mis à jour`);
      await fetchMembers();
    }
    setUpdatingId(null);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Role Legend */}
      <Card className="border-border bg-accent/30">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-accent-foreground mb-3">Rôles disponibles</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-md ${cfg.color}`}>
                  <cfg.icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{cfg.label}</p>
                  <p className="text-xs text-muted-foreground">{cfg.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {members.map(member => {
              const cfg = ROLE_CONFIG[member.role];
              const isSelf = member.user_id === user?.id;
              return (
                <div key={member.user_id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                      {member.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-card-foreground truncate">{member.full_name}</p>
                        {isSelf && <Badge variant="outline" className="text-xs py-0">Vous</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.email || member.phone || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && !isSelf ? (
                      <Select
                        value={member.role}
                        onValueChange={v => handleRoleChange(member, v)}
                        disabled={updatingId === member.user_id}
                      >
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          {updatingId === member.user_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrateur</SelectItem>
                          <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                          <SelectItem value="comptable">Comptable</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className={`text-xs gap-1 ${cfg.color}`}>
                        <cfg.icon className="h-3 w-3" />
                        {cfg.label}
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
            <p className="text-sm text-muted-foreground">
              Seuls les administrateurs peuvent modifier les rôles des membres.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
