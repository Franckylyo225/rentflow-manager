import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Smartphone, Trash2, Loader2, CheckCircle2, AlertTriangle, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TotpFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

export function SecurityTab() {
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [factorToDelete, setFactorToDelete] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const loadFactors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data?.totp ?? []);
    } catch (e: any) {
      console.error("Error loading MFA factors:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Application Authenticator",
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (e: any) {
      toast.error("Erreur lors de l'activation : " + e.message);
    } finally {
      setEnrolling(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!factorId || verifyCode.length < 6) return;
    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      toast.success("Authentification à double facteur activée !");
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode("");
      await loadFactors();
    } catch (e: any) {
      toast.error("Code invalide : " + e.message);
    } finally {
      setVerifying(false);
    }
  };

  const cancelEnroll = async () => {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode("");
  };

  const confirmUnenroll = (id: string) => {
    setFactorToDelete(id);
    setShowDeleteDialog(true);
  };

  const unenrollFactor = async () => {
    if (!factorToDelete) return;
    setUnenrolling(factorToDelete);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factorToDelete });
      if (error) throw error;
      toast.success("Authentification à double facteur désactivée");
      await loadFactors();
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    } finally {
      setUnenrolling(null);
      setShowDeleteDialog(false);
      setFactorToDelete(null);
    }
  };

  const verifiedFactors = factors.filter((f) => f.status === "verified");
  const isEnabled = verifiedFactors.length > 0;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Authentification à double facteur (2FA)</CardTitle>
                <CardDescription>
                  Ajoutez une couche de sécurité supplémentaire à votre compte
                </CardDescription>
              </div>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"} className="gap-1.5">
              {isEnabled ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Activée
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" /> Désactivée
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Enrolled factors */}
      {verifiedFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Méthodes configurées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {verifiedFactors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{factor.friendly_name || "Application Authenticator"}</p>
                    <p className="text-xs text-muted-foreground">
                      Ajoutée le {new Date(factor.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => confirmUnenroll(factor.id)}
                  disabled={unenrolling === factor.id}
                >
                  {unenrolling === factor.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Enroll TOTP */}
      {!qrCode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application d'authentification</CardTitle>
            <CardDescription>
              Utilisez une application comme Google Authenticator, Authy ou Microsoft Authenticator pour générer des codes de vérification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={startEnroll} disabled={enrolling} className="gap-2">
              {enrolling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Smartphone className="h-4 w-4" />
              )}
              {isEnabled ? "Ajouter une autre méthode" : "Configurer l'application"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code enrollment flow */}
      {qrCode && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Scanner le QR Code</CardTitle>
            <CardDescription>
              Scannez ce QR code avec votre application d'authentification, puis entrez le code à 6 chiffres généré.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-xl">
                <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
              {secret && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Ou entrez ce code manuellement :</p>
                  <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono select-all">
                    {secret}
                  </code>
                </div>
              )}
            </div>

            <div className="space-y-2 max-w-xs mx-auto">
              <Label htmlFor="verify-code">Code de vérification</Label>
              <Input
                id="verify-code"
                placeholder="000000"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-lg tracking-widest font-mono"
                maxLength={6}
                onKeyDown={(e) => e.key === "Enter" && verifyEnrollment()}
              />
            </div>

            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={cancelEnroll}>
                Annuler
              </Button>
              <Button onClick={verifyEnrollment} disabled={verifying || verifyCode.length < 6}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Vérifier et activer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver la double authentification ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre compte sera moins sécurisé sans la double authentification. Vous pourrez la réactiver à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={unenrollFactor} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
