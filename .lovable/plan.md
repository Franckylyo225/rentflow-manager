

## Plan : Paiement de loyer à l'avance (multi-mois)

### Objectif
Permettre d'enregistrer un paiement couvrant plusieurs mois consécutifs (2, 3, 6 ou 12 mois) en une seule opération, depuis la fiche d'une échéance ou du locataire.

### Comportement métier

- L'utilisateur sélectionne une échéance de départ (ex. mai 2026) et un nombre de mois à couvrir (2, 3, 6, 12, ou personnalisé).
- Le système génère automatiquement les échéances futures manquantes pour ce locataire (mêmes règles que `generate-monthly-rents` : `rent_due_day`, montant = `tenants.rent`).
- Le montant total saisi est réparti séquentiellement sur les échéances couvertes :
  - Chaque échéance est marquée **Payé** si entièrement couverte, **Partiel** si le reliquat ne suffit pas pour le dernier mois.
  - Un `payment_records` est créé pour chaque échéance impactée (même `payment_date`, même `method`, commentaire commun "Paiement anticipé X mois — réf. groupe").
- Aucune modification de schéma : on s'appuie sur les tables existantes `rent_payments` + `payment_records`.

### UI

**1. Nouveau dialogue `AdvancePaymentDialog`** (`src/components/rent/AdvancePaymentDialog.tsx`)
- Champs : mois de départ (auto = première échéance impayée), nombre de mois (radio 2/3/6/12 + "Autre"), méthode de paiement, date de paiement, commentaire.
- Récapitulatif live : liste des mois couverts + montant total calculé (`rent × n`), avec possibilité de saisir un montant différent (gestion partiel sur dernier mois).
- Bouton "Confirmer le paiement anticipé".

**2. Points d'entrée**
- `src/pages/Rents.tsx` : nouveau bouton "Paiement anticipé" dans le menu d'actions (à côté de "Enregistrer paiement").
- `src/pages/TenantDetail.tsx` : bouton équivalent dans la section paiements.

**3. Indicateur visuel**
- Badge discret "Payé d'avance" sur les `rent_payments` dont `due_date > today` et `status = paid`, dans la liste des loyers.

### Détails techniques

- Génération d'échéances manquantes : insert idempotent (vérifier `(tenant_id, month)` existant) avant la répartition.
- Transaction côté client : insertions séquentielles avec `Promise.all` pour les `payment_records`, puis update batch des `rent_payments` (status + paid_amount). En cas d'erreur partielle, afficher toast d'avertissement avec invitation à recharger.
- Notification interne : le trigger SQL existant `notify_on_payment_change` se déclenche déjà à chaque update de status — aucun changement nécessaire.
- Quittance : la génération PDF reste par mois (option future : quittance groupée).

### Fichiers impactés

- **Créé** : `src/components/rent/AdvancePaymentDialog.tsx`
- **Modifiés** : `src/pages/Rents.tsx`, `src/pages/TenantDetail.tsx`
- **DB** : aucune migration

