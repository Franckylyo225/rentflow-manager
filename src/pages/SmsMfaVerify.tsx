import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function SmsMfaVerify() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);

  const sendCode = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-2fa-code");
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setMaskedPhone(data.masked_phone ?? null);
      toast.success("Code envoyé par SMS");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'envoi du code");
    } finally {
      setSending(false);
    }
  };

  // Send the code automatically on mount
  useEffect(() => {
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async () => {
    if (code.length < 6) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-2fa-code", {
        body: { code },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Mark this session as SMS-2FA verified
      sessionStorage.setItem("sms_2fa_verified", "true");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Code invalide");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem("sms_2fa_verified");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Vérification par SMS</CardTitle>
            <CardDescription className="mt-1">
              {maskedPhone
                ? <>Un code à 6 chiffres a été envoyé au numéro se terminant par <strong>{maskedPhone}</strong></>
                : "Envoi du code de vérification..."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sms-code">Code reçu par SMS</Label>
            <Input
              id="sms-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-2xl tracking-[0.3em] font-mono h-14"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              disabled={sending}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={verifying || code.length < 6 || sending}
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Vérifier
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={sendCode}
            disabled={sending}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Renvoyer un code
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
