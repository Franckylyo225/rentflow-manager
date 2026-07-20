## Objectif
Permettre la saisie de mois d'avance lors de la création d'un locataire, marquer les échéances correspondantes comme payées, créer les `payment_records` associés et générer une quittance unique multi-mois démarrant à `lease_start`.

## Changements

### 1. `src/pages/Tenants.tsx` — Formulaire de création
- Ajouter un champ **"Mois d'avance payés"** (nombre entier, défaut 0) à côté de la caution.
- Afficher un aperçu du montant total (mois × loyer unité sélectionnée).
- Le champ n'apparaît qu'à la création (pas à l'édition).

### 2. `src/pages/Tenants.tsx` — Logique `handleSave`
Après la création du locataire et la génération des échéances `pending` :
- Sélectionner les N premières échéances à partir de `lease_start` (ordre chronologique).
- Pour chaque échéance couverte :
  - Mettre à jour `rent_payments`: `paid_amount = amount`, `status = 'paid'`, `paid_at = today`.
  - Créer un `payment_records` (montant = loyer, méthode = "avance_initiale" ou champ dédié, date = today).
- Construire le `monthsBreakdown` (mois + montant) et déclencher `generateQuittance` avec ces données pour produire une quittance PDF unique.

### 3. Règles de validation
- Bloquer si `Mois d'avance` > nombre d'échéances générées à partir de `lease_start` jusqu'à aujourd'hui + 12 mois futurs (on autorise donc l'avance sur mois futurs aussi).
- Si `lease_start` est dans le futur, générer les échéances futures nécessaires pour couvrir les avances.
- La caution reste séparée et n'apparaît pas dans la quittance de loyer.

## Détails techniques
- Réutiliser `generateQuittance` (déjà multi-mois) depuis `src/lib/generateQuittance.ts`.
- Les échéances à créer/mettre à jour partent toujours de `lease_start` (mois 1 = mois du `lease_start`).
- Méthode de paiement par défaut : `"cash"` avec note "Avance à la signature du bail" (ou ajouter un sélecteur simple : Espèces / Mobile Money / Chèque / Virement).
- Numéro de quittance généré selon le format standard `Q-YYMMDD-ID`.

## Fichiers touchés
- `src/pages/Tenants.tsx` (formulaire + `handleSave`)
- Aucun changement DB, aucun changement d'Edge Function.
