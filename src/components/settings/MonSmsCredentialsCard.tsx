import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Save, Loader2, Eye, EyeOff, Building, Tag } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

export function MonSmsCredentialsCard() {
  const { settings, updateSettings } = useOrganizationSettings();
  const [companyId, setCompanyId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setCompanyId(settings.monsms_company_id || "");
      setApiKey(settings.monsms_api_key || "");
      setSenderId(settings.monsms_sender_id || "");
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({
      monsms_company_id: companyId.trim() || null,
      monsms_api_key: apiKey.trim() || null,
      monsms_sender_id: senderId.trim() || null,
    } as any);
    setSaving(false);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <KeyRound className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Identifiants MonSMS Pro</CardTitle>
            <CardDescription>
              Configurez votre compte fournisseur SMS. Laissez vide pour utiliser les identifiants par défaut.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monsms-company" className="text-sm font-medium flex items-center gap-2">
              <Building className="h-3.5 w-3.5" /> Company ID
            </Label>
            <Input
              id="monsms-company"
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              placeholder="Ex: 69da9473f1dda2e0672e0b64"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monsms-sender" className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-3.5 w-3.5" /> Sender ID
            </Label>
            <Input
              id="monsms-sender"
              value={senderId}
              onChange={e => setSenderId(e.target.value)}
              placeholder="Ex: RENTFLOW"
              maxLength={11}
            />
            <p className="text-xs text-muted-foreground">Nom d'expéditeur affiché sur les SMS (doit être approuvé par MonSMS)</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="monsms-key" className="text-sm font-medium flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5" /> API Key
          </Label>
          <div className="relative">
            <Input
              id="monsms-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Votre clé API MonSMS Pro"
              autoComplete="off"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label={showKey ? "Masquer" : "Afficher"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Trouvez vos identifiants sur <a href="https://app.monsms.pro" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">app.monsms.pro</a> → page Développeur
          </p>
        </div>
        <div className="flex justify-end">
          <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
