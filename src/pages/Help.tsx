import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Building2, Landmark, Users, CreditCard, Receipt, Users2,
  BarChart3, Bell, Settings, Shield, Search, HelpCircle, Sparkles, KeyRound,
  FileText, MessageSquare, MapPin, AlertTriangle, Banknote
} from "lucide-react";
import { useState, useMemo } from "react";

interface Section {
  id: string;
  icon: any;
  title: string;
  summary: string;
  items: { q: string; a: string }[];
}

const SECTIONS: Section[] = [
  {
    id: "demarrage",
    icon: Sparkles,
    title: "Démarrage rapide",
    summary: "Premiers pas avec SCI Binieba",
    items: [
      { q: "Comment me connecter ?", a: "Accédez à la page de connexion, saisissez votre email et mot de passe. Si la double authentification (2FA) est activée, vous serez invité à saisir un code TOTP ou un code SMS avant d'accéder au tableau de bord." },
      { q: "Comment réinitialiser mon mot de passe ?", a: "Sur la page de connexion, cliquez sur « Mot de passe oublié ». Vous recevrez un email avec un lien sécurisé. Si la 2FA TOTP est activée, vous devrez confirmer un code avant de définir un nouveau mot de passe." },
      { q: "Comment être invité dans une organisation ?", a: "Un administrateur doit créer votre compte depuis Paramètres → Utilisateurs & Rôles. Vous recevrez vos identifiants et pourrez vous connecter immédiatement (votre compte doit être approuvé par un administrateur)." },
    ],
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Tableau de bord",
    summary: "Vue d'ensemble dynamique de votre activité",
    items: [
      { q: "Que montre le tableau de bord ?", a: "Il affiche les KPIs essentiels : revenus du mois, taux d'occupation, impayés, alertes critiques, et un bandeau financier avec les encaissements en cours." },
      { q: "À quoi servent les actions rapides ?", a: "Le bouton avec la grille (en haut à droite) permet de créer rapidement un bien, un locataire, un paiement ou une dépense, sans naviguer dans les menus." },
      { q: "Comment utiliser la recherche globale ?", a: "Cliquez sur la barre de recherche en haut ou utilisez le raccourci ⌘K (Ctrl+K). Vous pouvez naviguer instantanément vers un bien, un locataire ou une page." },
    ],
  },
  {
    id: "biens",
    icon: Building2,
    title: "Biens & Unités",
    summary: "Gérer vos biens locatifs et leurs unités",
    items: [
      { q: "Comment créer un bien ?", a: "Allez dans « Biens » → « Nouveau bien ». Renseignez le nom, la ville, l'adresse et la description. Vous pourrez ensuite y ajouter plusieurs unités locatives." },
      { q: "Qu'est-ce qu'une unité ?", a: "Une unité représente un logement ou local louable au sein d'un bien (ex: un appartement dans un immeuble). Chaque unité a son propre loyer, statut (Occupé/Vacant) et locataire." },
      { q: "Puis-je supprimer une unité occupée ?", a: "Non. Pour préserver l'intégrité des données, une unité occupée par un locataire actif ne peut pas être supprimée. Vous devez d'abord clôturer le bail." },
      { q: "Comment fonctionne le statut Occupé/Vacant ?", a: "Le statut bascule automatiquement : « Occupé » dès qu'un locataire actif est associé, « Vacant » dès la clôture du bail." },
    ],
  },
  {
    id: "patrimoine",
    icon: Landmark,
    title: "Patrimoine",
    summary: "Suivre vos titres fonciers et actifs",
    items: [
      { q: "À quoi sert le module Patrimoine ?", a: "Il permet de suivre vos actifs fonciers (terrains, immeubles, parcelles) avec leurs documents légaux : titres fonciers, ACD, attestations, plans, etc." },
      { q: "Comment ajouter plusieurs documents à un actif ?", a: "Ouvrez la fiche de l'actif → bouton « Ajouter des documents ». Sélectionnez plusieurs fichiers à la fois, nommez-les et choisissez leur type avant l'envoi groupé." },
      { q: "Que signifie « Dossier complet » ?", a: "Un dossier est marqué complet dès qu'un ACD (Arrêté de Concession Définitive) est attaché à l'actif." },
      { q: "Comment mettre un actif du patrimoine en location ?", a: "Activez l'option « Mettre en location » dans le formulaire de l'actif. Le champ Ville devient obligatoire. L'actif sera alors disponible comme bien locatif." },
      { q: "Comment vendre un actif en location ?", a: "Lors de l'enregistrement de la vente, l'application met automatiquement fin aux baux en cours sur les unités du bien avant de finaliser la vente." },
      { q: "Puis-je voir l'emplacement géographique ?", a: "Oui, ajoutez un lien Google Maps ou des coordonnées : une carte OpenStreetMap s'affichera dans la fiche de l'actif." },
    ],
  },
  {
    id: "locataires",
    icon: Users,
    title: "Locataires",
    summary: "Gestion des locataires particuliers et entreprises",
    items: [
      { q: "Comment créer un locataire ?", a: "Allez dans « Locataires » → « Nouveau locataire ». Choisissez le type (Particulier ou Entreprise), renseignez les informations d'identité, le contact et associez-le à une unité." },
      { q: "Quelle différence entre Particulier et Entreprise ?", a: "Un locataire entreprise (B2B) requiert un numéro RCCM et la raison sociale. Les particuliers utilisent une pièce d'identité (CNI, passeport)." },
      { q: "Puis-je avoir plusieurs locataires sur une unité ?", a: "Non, une unité ne peut accueillir qu'un seul locataire actif à la fois. Pour changer de locataire, clôturez d'abord le bail en cours." },
      { q: "Comment filtrer mes locataires ?", a: "Utilisez les filtres croisés : score de risque, ville, bien. Vous pouvez aussi trier par score pour repérer les profils à risque." },
      { q: "Qu'est-ce que le score de risque ?", a: "Un calcul automatique (0-100) basé sur l'historique de paiement, le nombre de retards et l'ancienneté. Plus le score est élevé, plus le risque de contentieux est important." },
    ],
  },
  {
    id: "loyers",
    icon: CreditCard,
    title: "Loyers & Paiements",
    summary: "Encaissements, quittances et suivi",
    items: [
      { q: "Comment sont générés les loyers ?", a: "Les loyers sont créés automatiquement chaque mois pour chaque locataire actif, avec une date d'échéance basée sur la configuration de l'organisation." },
      { q: "Quels sont les statuts de paiement ?", a: "« Payé » (montant total reçu), « Partiel » (paiement incomplet), « En retard » (échéance dépassée sans paiement), « En attente » (avant échéance)." },
      { q: "Comment enregistrer un paiement ?", a: "Dans « Loyers », cliquez sur un loyer dû et sélectionnez « Enregistrer un paiement ». Renseignez le montant, le mode (Espèces, Mobile Money, Virement…) et la date." },
      { q: "Comment générer une quittance ?", a: "Une fois le paiement enregistré, cliquez sur « Quittance ». Un PDF est généré au format Q-YYMMDD-ID, signé par le signataire configuré dans les paramètres." },
      { q: "Puis-je enregistrer un paiement d'avance ?", a: "Oui, utilisez l'option « Paiement d'avance ». Le crédit sera automatiquement déduit des loyers à venir." },
      { q: "Y a-t-il un prorata en cas de fin de bail ?", a: "Non. Le loyer du mois de clôture est dû en totalité, sans prorata." },
    ],
  },
  {
    id: "depenses",
    icon: Receipt,
    title: "Dépenses",
    summary: "Suivi des charges et frais",
    items: [
      { q: "Comment ajouter une dépense ?", a: "Allez dans « Dépenses » → « Nouvelle dépense ». Renseignez le montant, la catégorie, la date et associez-la à un bien si nécessaire." },
      { q: "Maintenance et dépenses ?", a: "Lorsqu'un ticket de maintenance est clôturé, vous pouvez le convertir directement en dépense pour suivre le coût des interventions." },
    ],
  },
  {
    id: "salaires",
    icon: Users2,
    title: "Salaires",
    summary: "Gestion optionnelle des employés",
    items: [
      { q: "Comment activer le module Salaires ?", a: "Module optionnel. Allez dans Paramètres → Général et activez « Gestion des salaires ». Le menu apparaîtra dans la barre latérale." },
      { q: "À quoi sert ce module ?", a: "Il permet de gérer les employés de votre organisation et de suivre leurs rémunérations mensuelles." },
    ],
  },
  {
    id: "rapports",
    icon: BarChart3,
    title: "Rapports financiers",
    summary: "Analyses et exports",
    items: [
      { q: "Quels rapports sont disponibles ?", a: "Revenus mensuels, répartition par ville, taux d'occupation, impayés cumulés, et bilan annuel." },
      { q: "Puis-je exporter les données ?", a: "Oui, les tableaux peuvent être exportés. Les rapports sont disponibles en format PDF/CSV selon les sections." },
    ],
  },
  {
    id: "impayes",
    icon: AlertTriangle,
    title: "Impayés & Relances",
    summary: "Escalade automatique et contentieux",
    items: [
      { q: "Comment fonctionnent les relances automatiques ?", a: "Des SMS/Emails sont envoyés à J-5 (rappel avant échéance), J+1 (premier retard) et J+7 (relance importante). L'envoi s'arrête dès que le loyer est payé." },
      { q: "Quels sont les niveaux d'escalade ?", a: "« Léger » (premier retard), « Important » (15+ jours), « Critique » (30+ jours, mise en demeure recommandée)." },
      { q: "Comment générer une mise en demeure ?", a: "Depuis la fiche du locataire en escalade « Critique », cliquez sur « Mise en demeure ». Un PDF officiel est généré avec les références du bail et les sommes dues." },
      { q: "Validation humaine requise ?", a: "Oui, les actions critiques (mise en demeure, expulsion, clôture forcée) requièrent une validation manuelle d'un administrateur ou gestionnaire." },
    ],
  },
  {
    id: "fin-bail",
    icon: KeyRound,
    title: "Fin de bail",
    summary: "Clôture et restitution du dépôt",
    items: [
      { q: "Comment mettre fin à un bail ?", a: "Sur la fiche du locataire, cliquez sur « Clôturer le bail ». Renseignez le motif (départ volontaire, expulsion, fin de contrat) et la date." },
      { q: "Comment gérer le dépôt de garantie ?", a: "Lors de la clôture, vous pouvez déduire directement les frais de réparations sur le dépôt. Le solde restant est calculé automatiquement." },
      { q: "Où voir les anciens locataires ?", a: "Un onglet « Anciens locataires » liste tous les baux clôturés avec le motif, la date de fin et le solde final." },
    ],
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    summary: "Alertes internes et historique SMS",
    items: [
      { q: "Quelles notifications je reçois ?", a: "Alertes en temps réel sur les changements de statut de loyers, nouveaux paiements, retards critiques et actions à valider." },
      { q: "Où voir l'historique des SMS envoyés ?", a: "Paramètres → Notification SMS → Historique. Vous voyez le statut de livraison synchronisé via les Delivery Receipts d'Orange Developer." },
    ],
  },
  {
    id: "parametres",
    icon: Settings,
    title: "Paramètres",
    summary: "Configuration de votre organisation",
    items: [
      { q: "Que contient l'onglet Général ?", a: "Nom de l'organisation, logo, RCCM, signataire des quittances, modules optionnels (salaires) et configurations légales." },
      { q: "Onglet Finance ?", a: "Devise (FCFA par défaut), date d'échéance des loyers, frais de retard, configurations comptables." },
      { q: "Comment gérer les utilisateurs ?", a: "Onglet Utilisateurs & Rôles : créez des comptes, attribuez des rôles (Admin, Gestionnaire, Comptable), et restreignez l'accès géographique si nécessaire." },
    ],
  },
  {
    id: "securite",
    icon: Shield,
    title: "Sécurité",
    summary: "2FA et accès protégé",
    items: [
      { q: "Comment activer la double authentification ?", a: "Paramètres → Sécurité. Choisissez TOTP (application Google Authenticator/Authy) ou SMS. Une fois activée, elle est obligatoire à chaque connexion." },
      { q: "Que faire si je perds mon téléphone ?", a: "Contactez un administrateur de votre organisation pour réinitialiser votre 2FA. Conservez vos codes de récupération en lieu sûr." },
      { q: "Mes données sont-elles isolées ?", a: "Oui, chaque organisation est strictement isolée via Row-Level Security. Aucun utilisateur ne peut accéder aux données d'une autre organisation." },
    ],
  },
  {
    id: "roles",
    icon: Users,
    title: "Rôles & Permissions",
    summary: "Qui peut faire quoi ?",
    items: [
      { q: "Administrateur", a: "Accès total : configuration de l'organisation, gestion des utilisateurs, suppression de données, validation des actions critiques." },
      { q: "Gestionnaire", a: "Gestion opérationnelle : biens, locataires, baux, paiements, dépenses. Peut valider certaines actions mais pas modifier les paramètres globaux." },
      { q: "Comptable", a: "Accès lecture/écriture aux loyers, paiements, dépenses et rapports financiers. Pas d'accès aux paramètres ni à la gestion des utilisateurs." },
    ],
  },
];

export default function Help() {
  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState<string>("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.items.length > 0 || s.title.toLowerCase().includes(q));
  }, [search]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Centre d'aide
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Documentation complète des fonctionnalités de SCI Binieba
            </p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto">
            {SECTIONS.reduce((acc, s) => acc + s.items.length, 0)} articles
          </Badge>
        </div>

        {/* Recherche */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans l'aide… (ex: quittance, 2FA, vente)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </CardContent>
        </Card>

        {/* Navigation rapide */}
        {!search && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.items.length} questions</p>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun résultat pour « {search} ».
              </CardContent>
            </Card>
          ) : (
            filtered.map((s) => (
              <Card key={s.id} id={s.id} className="scroll-mt-20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <s.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-base font-semibold">{s.title}</div>
                      <div className="text-xs font-normal text-muted-foreground mt-0.5">{s.summary}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {s.items.map((item, idx) => (
                      <AccordionItem key={idx} value={`${s.id}-${idx}`}>
                        <AccordionTrigger className="text-sm text-left hover:no-underline">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Contact */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Vous ne trouvez pas votre réponse ?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contactez votre administrateur ou l'équipe support de SCI Binieba pour toute question spécifique.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
