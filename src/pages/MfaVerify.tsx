import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function MfaVerify() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFactors = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data?.totp?.length) {
        navigate("/", { replace: true });
        return;
      }
      const verified = data.totp.filter((f) => f.status === "verified");
      if (verified.length === 0) {
        navigate("/", { replace: true });
        return;
      }
      setFactorId(verified[0].id);
      setLoading(false);
    };
    checkFactors();
  }, [navigate]);

  const handleVerify = async () => {
    if (!factorId || code.length < 6) return;
    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error("Code invalide. Veuillez réessayer.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Vérification en deux étapes</CardTitle>
            <CardDescription className="mt-1">
              Entrez le code à 6 chiffres généré par votre application d'authentification
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Code de vérification</Label>
            <Input
              id="mfa-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-2xl tracking-[0.3em] font-mono h-14"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={verifying || code.length < 6}
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Vérifier
          </Button>

          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
