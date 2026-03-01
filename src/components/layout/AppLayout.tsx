import { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CityOption {
  id: string;
  name: string;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("all");
  const [cities, setCities] = useState<CityOption[]>([]);
  const { profile, organization } = useProfile();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase.from("cities").select("id, name").order("name").then(({ data }) => {
      if (data) setCities(data);
    });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-60 min-h-screen flex flex-col">
        <AppHeader
          onMenuClick={() => setSidebarOpen(true)}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          orgName={organization?.name}
          userName={profile?.full_name}
          cities={cities}
        />
        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
