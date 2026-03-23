import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Building2, Globe, Upload, Camera, Save, Loader2, MapPin, Scale, Users2 } from "lucide-react";
import { OrganizationSettings, useOrganizationSettings } from "@/hooks/useOrganizationSettings";

const CURRENCIES = ["FCFA", "EUR", "USD", "GBP", "MAD", "XAF"];
const DATE_FORMATS = ["dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];
const TIMEZONES = [
  "Africa/Abidjan", "Africa/Lagos", "Africa/Douala", "Africa/Casablanca",
  "Europe/Paris", "Europe/London", "America/New_York",
];

interface Props {
  settings: OrganizationSettings;
  onSave: (updates: Partial<OrganizationSettings>) => Promise<boolean>;
  onUploadLogo: (file: File) => Promise<string | null>;
}

export function GeneralTab({ settings, onSave, onUploadLogo }: Props) {
  const [form, setForm] = useState({
    name: settings.name || "",
    email: settings.email || "",
    phone: settings.phone || "",
    address: settings.address || "",
    currency: settings.currency || "FCFA",
    date_format: settings.date_format || "dd/MM/yyyy",
    timezone: settings.timezone || "Africa/Abidjan",
    legal_name: settings.legal_name || "",
    legal_id: settings.legal_id || "",
    legal_address: settings.legal_address || "",
    logo_url: settings.logo_url || "",
    salaries_enabled: settings.salaries_enabled ?? true,
    sms_sender_name: settings.sms_sender_name || "SCI Binieba",
    sms_sender_number: settings.sms_sender_number || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUploadLogo(file);
    if (url) {
      set("logo_url", url);
      await onSave({ logo_url: url });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      currency: form.currency,
      date_format: form.date_format,
      timezone: form.timezone,
      legal_name: form.legal_name || null,
      legal_id: form.legal_id || null,
      legal_address: form.legal_address || null,
      salaries_enabled: form.salaries_enabled,
      sms_sender_name: form.sms_sender_name || "SCI Binieba",
      sms_sender_number: form.sms_sender_number || null,
    } as any);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-4 w-4 text-primary" /></div>
            <div>
              <CardTitle className="text-base">Informations de l'entreprise</CardTitle>
              <CardDescription>Identité et coordonnées de votre société</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo */}
          <div className="flex items-center gap-5">
            <div
              className="relative h-20 w-20 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={() => fileRef.current?.click()}
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary-foreground" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-card-foreground">Logo de l'entreprise</p>
              <p className="text-xs text-muted-foreground">PNG, JPG. Max 2 Mo.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de l'entreprise *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email de contact</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={e => set("address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nom d'expéditeur SMS</Label>
              <Input value={form.sms_sender_name} onChange={e => set("sms_sender_name", e.target.value)} placeholder="Ex: SCI Binieba" maxLength={11} />
              <p className="text-xs text-muted-foreground">Nom affiché comme expéditeur des SMS (max 11 caractères)</p>
            </div>
            <div className="space-y-2">
              <Label>N° expéditeur SMS</Label>
              <Input value={form.sms_sender_number} onChange={e => set("sms_sender_number", e.target.value)} placeholder="Ex: +2250000" />
              <p className="text-xs text-muted-foreground">Numéro d'expéditeur Orange (requis en mode Sandbox)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Globe className="h-4 w-4 text-primary" /></div>
            <div>
              <CardTitle className="text-base">Préférences régionales</CardTitle>
              <CardDescription>Devise, format de date et fuseau horaire</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={form.currency} onValueChange={v => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format de date</Label>
              <Select value={form.date_format} onValueChange={v => set("date_format", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fuseau horaire</Label>
              <Select value={form.timezone} onValueChange={v => set("timezone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users2 className="h-4 w-4 text-primary" /></div>
            <div>
              <CardTitle className="text-base">Modules optionnels</CardTitle>
              <CardDescription>Activez ou désactivez les fonctionnalités selon vos besoins</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-card-foreground">Gestion des salaires</p>
              <p className="text-xs text-muted-foreground">Suivi du personnel et génération automatique des charges salariales</p>
            </div>
            <Switch
              checked={form.salaries_enabled}
              onCheckedChange={v => setForm(prev => ({ ...prev, salaries_enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Legal Info */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Scale className="h-4 w-4 text-primary" /></div>
            <div>
              <CardTitle className="text-base">Coordonnées légales</CardTitle>
              <CardDescription>Informations juridiques de la société</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Raison sociale</Label>
              <Input value={form.legal_name} onChange={e => set("legal_name", e.target.value)} placeholder="Ex: SCI Immobilia" />
            </div>
            <div className="space-y-2">
              <Label>N° d'identification (RCCM)</Label>
              <Input value={form.legal_id} onChange={e => set("legal_id", e.target.value)} placeholder="Ex: CI-ABJ-2024-B-12345" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Adresse du siège social</Label>
              <Input value={form.legal_address} onChange={e => set("legal_address", e.target.value)} placeholder="Ex: Plateau, Abidjan" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
