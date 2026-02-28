import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Shield, Users } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">Configuration de votre espace Rentflow</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-4 w-4 text-primary" /></div>
              <CardTitle className="text-base">Informations de l'entreprise</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de l'entreprise</Label>
                <Input defaultValue="Immobilière Atlas" />
              </div>
              <div className="space-y-2">
                <Label>Email de contact</Label>
                <Input defaultValue="contact@atlas-immo.ma" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input defaultValue="+212 5 22 34 56 78" />
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input defaultValue="45 Bd Zerktouni, Casablanca" />
              </div>
            </div>
            <Button>Enregistrer</Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-4 w-4 text-primary" /></div>
              <CardTitle className="text-base">Sécurité</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">L'authentification et la gestion des rôles seront disponibles après activation de Lovable Cloud.</p>
            <div className="p-3 rounded-lg bg-muted text-sm">
              <p className="font-medium text-card-foreground">Rôles prévus :</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• <strong>Administrateur</strong> — Accès complet</li>
                <li>• <strong>Gestionnaire</strong> — Gestion des biens et locataires</li>
                <li>• <strong>Comptable</strong> — Accès aux loyers et rapports</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
