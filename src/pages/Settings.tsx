import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Banknote, Tag, Bell, Loader2 } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { FinanceTab } from "@/components/settings/FinanceTab";
import { CategoriesTab } from "@/components/settings/CategoriesTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";

export default function SettingsPage() {
  const { settings, loading, updateSettings, uploadLogo } = useOrganizationSettings();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">Configuration de votre espace Rentflow</p>
        </div>

        {loading || !settings ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="general" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Général</TabsTrigger>
              <TabsTrigger value="finance" className="gap-1.5"><Banknote className="h-3.5 w-3.5" /> Finance</TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Catégories</TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab settings={settings} onSave={updateSettings} onUploadLogo={uploadLogo} />
            </TabsContent>

            <TabsContent value="finance">
              <FinanceTab settings={settings} onSave={updateSettings} />
            </TabsContent>

            <TabsContent value="categories">
              <CategoriesTab />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationsTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
