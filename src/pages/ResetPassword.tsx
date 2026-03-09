import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, CheckCircle2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [loading, setLoading] = useState(true);

  // MFA state
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaVerified, setMfaVerified] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setValidSession(true);
        setLoading(false);
      }
    });

    const handleRecovery = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Code exchange error:", error);
            setLoading(false);
            return;
          }
          return;
        } catch (err) {
          console.error("Recovery error:", err);
          setLoading(false);
          return;
        }
      }

      const hash = window.location.hash;
      if (hash && hash.includes("type=recovery")) {
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setValidSession(true);
          }
          setLoading(false);
        }, 1500);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setValidSession(true);
      }
      setLoading(false);
    };

    handleRecovery();
    return () => subscription.unsubscribe();
  }, []);

  // Check MFA factors once session is valid
  useEffect(() => {
    if (!validSession) return;
    const checkMfa = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data?.totp?.length) {
        const verified = data.totp.filter((f) => f.status === "verified");
        if (verified.length > 0) {
          setFactorId(verified[0].id);
          setNeedsMfa(true);
          return;
        }
      }
      // No MFA, can proceed directly
      setMfaVerified(true);
    };
    checkMfa();
  }, [validSession]);

  const handleMfaVerify = async () => {
    if (!factorId || mfaCode.length < 6) return;
    setSubmitting(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      setMfaVerified(true);
      setNeedsMfa(false);
      toast.success("Vérification réussie");
    } catch (e: any) {
      toast.error("Code invalide. Veuillez réessayer.");
      setMfaCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success("Mot de passe modifié avec succès");
      setTimeout(() => navigate("/", { replace: true }), 2000);
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>Lien expiré</CardTitle>
            <CardDescription>
              Ce lien de réinitialisation n'est plus valide. Veuillez en demander un nouveau depuis la page de connexion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth", { replace: true })}>
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle>Mot de passe modifié</CardTitle>
            <CardDescription>Redirection en cours...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // MFA verification step
  if (needsMfa && !mfaVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Vérification requise</CardTitle>
              <CardDescription>
                Entrez le code à 6 chiffres de votre application d'authentification pour continuer
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-reset-code">Code de vérification</Label>
              <Input
                id="mfa-reset-code"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.3em] font-mono h-14"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleMfaVerify()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleMfaVerify}
              disabled={submitting || mfaCode.length < 6}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Vérifier et continuer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Nouveau mot de passe</CardTitle>
            <CardDescription>Choisissez un nouveau mot de passe pour votre compte</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pw">Nouveau mot de passe</Label>
              <Input
                id="new-pw"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirmer le mot de passe</Label>
              <Input
                id="confirm-pw"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || password.length < 6 || password !== confirmPassword}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Réinitialiser le mot de passe
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
