import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import Rents from "./pages/Rents";
import Expenses from "./pages/Expenses";
import Employees from "./pages/Employees";
import ExpenseCategories from "./pages/ExpenseCategories";
import FinancialReports from "./pages/FinancialReports";
import Notifications from "./pages/Notifications";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
            <Route path="/properties/:id" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
            <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
            <Route path="/tenants/:id" element={<ProtectedRoute><TenantDetail /></ProtectedRoute>} />
            <Route path="/rents" element={<ProtectedRoute><Rents /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
            <Route path="/expense-categories" element={<ProtectedRoute><ExpenseCategories /></ProtectedRoute>} />
            <Route path="/financial-reports" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
