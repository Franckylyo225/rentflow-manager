import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();
  const [mfaChecking, setMfaChecking] = useState(true);
  const [needsMfa, setNeedsMfa] = useState(false);

  useEffect(() => {
    const checkMfa = async () => {
      if (!user) {
        setMfaChecking(false);
        return;
      }
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) {
          setMfaChecking(false);
          return;
        }
        // If user has enrolled TOTP but current session is only aal1, require MFA
        if (data.nextLevel === "aal2" && data.currentLevel === "aal1") {
          setNeedsMfa(true);
        } else {
          setNeedsMfa(false);
        }
      } catch {
        // ignore
      }
      setMfaChecking(false);
    };
    checkMfa();
  }, [user]);

  if (loading || profileLoading || mfaChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (needsMfa) return <Navigate to="/mfa-verify" replace />;

  // SMS 2FA : if enabled on profile and not yet verified for this session, redirect
  if (profile?.sms_2fa_enabled && profile?.sms_2fa_phone) {
    const verified = sessionStorage.getItem("sms_2fa_verified") === "true";
    if (!verified) return <Navigate to="/sms-mfa-verify" replace />;
  }

  // Show pending approval screen
  if (profile && !profile.is_approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">En attente d'approbation</h1>
            <p className="text-muted-foreground">
              Votre demande d'inscription a bien été reçue. Un administrateur doit valider votre accès avant que vous puissiez utiliser la plateforme.
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
            <p>Vous recevrez un email une fois votre compte approuvé.</p>
          </div>
          <Button variant="outline" onClick={() => signOut()} className="gap-2">
            <LogOut className="h-4 w-4" /> Se déconnecter
          </Button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
