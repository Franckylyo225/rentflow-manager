import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Mail, Lock, User, Briefcase, ArrowRight, UserPlus, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [isSignUp, setIsSignUp] = useState(!!inviteToken);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If invite link, default to signup mode
  useEffect(() => {
    if (inviteToken) setIsSignUp(true);
  }, [inviteToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Veuillez entrer votre adresse email");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Un email de réinitialisation vous a été envoyé");
      setIsForgotPassword(false);
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      if (!fullName.trim()) {
        toast.error("Veuillez remplir tous les champs");
        setSubmitting(false);
        return;
      }
      if (!inviteToken && !companyName.trim()) {
        toast.error("Veuillez remplir le nom de l'entreprise");
        setSubmitting(false);
        return;
      }

      if (inviteToken) {
        const { error } = await signUp(email, password, fullName, "", inviteToken);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Inscription réussie ! Un administrateur doit approuver votre accès.");
        }
      } else {
        const { error } = await signUp(email, password, fullName, companyName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Vérifiez votre email pour confirmer votre inscription");
        }
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("Email ou mot de passe incorrect");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — hero image */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-10" />
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
          alt="Gestion immobilière"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-12 xl:p-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
            className="space-y-4 max-w-lg"
          >
            <h2 className="text-4xl xl:text-5xl font-extrabold leading-tight text-white drop-shadow-lg">
              Gérez vos biens<br />en toute simplicité
            </h2>
            <p className="text-lg text-white/85 leading-relaxed drop-shadow-md">
              Suivi des loyers, gestion des locataires, rapports financiers — tout ce dont vous avez besoin, au même endroit.
            </p>
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="flex items-center gap-3 pt-2"
            >
              <div className="h-1 w-12 rounded-full bg-primary" />
              <span className="text-sm font-medium text-white/70">Plateforme de gestion locative</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right panel — form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 bg-background relative"
      >
        <div className="absolute top-8 left-6 sm:left-12 lg:left-16 xl:left-24 flex items-center gap-3">
          <img src="/logo-horizontal.png" alt="SCI Binieba" className="h-10" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={isForgotPassword ? "forgot" : isSignUp ? (inviteToken ? "invite" : "signup") : "signin"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md mx-auto space-y-8"
          >
          {/* Forgot password view */}
          {isForgotPassword ? (
            <>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Mot de passe oublié
                </h1>
                <p className="text-muted-foreground">
                  Entrez votre adresse email pour recevoir un lien de réinitialisation
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="vous@entreprise.com"
                      className="pl-10 h-12 bg-muted/50 border-border/60 focus:bg-background transition-colors"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  ) : (
                    <>
                      Envoyer le lien
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
          {/* Title */}
          <div className="space-y-2">
            {inviteToken && isSignUp ? (
              <>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <UserPlus className="h-5 w-5" />
                  <span className="text-sm font-medium">Invitation</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Rejoindre l'équipe
                </h1>
                <p className="text-muted-foreground">
                  Créez votre compte pour rejoindre l'organisation. Un administrateur validera votre accès.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {isSignUp ? "Créer votre compte" : "Bon retour parmi nous"}
                </h1>
                <p className="text-muted-foreground">
                  {isSignUp
                    ? "Inscrivez-vous pour commencer à gérer vos biens immobiliers"
                    : "Connectez-vous pour accéder à votre espace de gestion"}
                </p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className={inviteToken ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Ex: Kouadio Jean"
                      className="pl-10 h-12 bg-muted/50 border-border/60 focus:bg-background transition-colors"
                      required
                    />
                  </div>
                </div>
                {!inviteToken && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Nom de l'entreprise</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="Ex: Immobilière Ivoire"
                        className="pl-10 h-12 bg-muted/50 border-border/60 focus:bg-background transition-colors"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={isSignUp && !inviteToken ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-5"}>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="vous@entreprise.com"
                    className="pl-10 h-12 bg-muted/50 border-border/60 focus:bg-background transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">Mot de passe</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-12 bg-muted/50 border-border/60 focus:bg-background transition-colors"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              disabled={submitting}
            >
              {submitting ? (
                <div className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
              ) : (
                <>
                  {isSignUp ? (inviteToken ? "Demander l'accès" : "Créer mon compte") : "Se connecter"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Toggle */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp ? (
                <>Déjà un compte ? <span className="font-semibold text-primary">Se connecter</span></>
              ) : (
                <>Pas encore de compte ? <span className="font-semibold text-primary">S'inscrire</span></>
              )}
            </button>
          </div>
            </>
          )}
          </motion.div>
        </AnimatePresence>

        <p className="absolute bottom-6 left-6 sm:left-12 lg:left-16 xl:left-24 text-xs text-muted-foreground">
          © {new Date().getFullYear()} SCI Binieba. Développé avec ❤️ à Abidjan. Tous droits réservés.
        </p>
      </motion.div>
    </div>
  );
}
