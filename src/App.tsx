import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { OrganizationSettingsProvider } from "@/contexts/OrganizationSettingsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AuthPage from "./pages/Auth";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Tenants = lazy(() => import("./pages/Tenants"));
const TenantDetail = lazy(() => import("./pages/TenantDetail"));
const Rents = lazy(() => import("./pages/Rents"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Employees = lazy(() => import("./pages/Employees"));
const FinancialReports = lazy(() => import("./pages/FinancialReports"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Patrimoine = lazy(() => import("./pages/Patrimoine"));
const PatrimoineDetail = lazy(() => import("./pages/PatrimoineDetail"));
const MfaVerify = lazy(() => import("./pages/MfaVerify"));
const SmsMfaVerify = lazy(() => import("./pages/SmsMfaVerify"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Help = lazy(() => import("./pages/Help"));
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // `staleTime` reste à 0 volontairement. Garder les données en cache
      // plusieurs secondes accélérerait la navigation, mais l'application écrit
      // dans plusieurs tables à la fois (créer un locataire touche `tenants`,
      // `units`, `rent_payments` et `payment_records`) depuis une soixantaine
      // d'endroits qui ne rafraîchissent que leur propre liste. On afficherait
      // alors des loyers périmés. Le gain de confort est conservé autrement :
      // React Query rend immédiatement les données déjà connues et revalide en
      // arrière-plan, au lieu de repartir d'une liste vide avec un spinner.
      staleTime: 0,
      // Le retour sur l'onglet rechargeait tout sans que rien ne l'ait demandé.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <OrganizationSettingsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/mfa-verify" element={<MfaVerify />} />
                  <Route path="/sms-mfa-verify" element={<SmsMfaVerify />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
                  <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
                  <Route path="/patrimoine" element={<ProtectedRoute><Patrimoine /></ProtectedRoute>} />
                  <Route path="/patrimoine/:id" element={<ProtectedRoute><PatrimoineDetail /></ProtectedRoute>} />
                  <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
                  <Route path="/tenants/:id" element={<ProtectedRoute><TenantDetail /></ProtectedRoute>} />
                  <Route path="/rents" element={<ProtectedRoute><Rents /></ProtectedRoute>} />
                  <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
                  <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
                  <Route path="/financial-reports" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </OrganizationSettingsProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
