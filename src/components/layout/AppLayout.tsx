import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("all");

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-60 min-h-screen flex flex-col">
        <AppHeader
          onMenuClick={() => setSidebarOpen(true)}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
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
