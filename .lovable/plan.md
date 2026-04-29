## Refonte du Paiement Anticipé — Sélection de mois & blocage des arriérés

### Objectif
Remplacer le choix "nombre de mois + mois de départ" par une **sélection visuelle des mois** que le locataire souhaite payer. Si des **impayés antérieurs** existent, l'utilisateur doit obligatoirement les régler **avant** de pouvoir cocher des échéances futures.

### Comportement UX

1. **Au chargement** : la modale charge tous les `rent_payments` du locataire et calcule également les **12 prochains mois** (à venir) qui n'existent pas encore en base.

2. **Affichage en deux sections** :
   - **Arriérés à régler en priorité** (statuts `pending`, `partial`, `late` dont `due_date < aujourd'hui`)  
     → Cases **pré-cochées et verrouillées** (impossible de décocher).
     → Bandeau d'avertissement orange : "Vous devez régler N mois en retard avant tout paiement anticipé".
   - **Échéances à venir** (mois en cours + futurs)  
     → Cases **cochables** UNIQUEMENT si tous les arriérés sont sélectionnés (sinon désactivées avec tooltip explicatif).
     → Sélection contiguë : si l'utilisateur coche le mois N+3, les mois N+1 et N+2 se cochent automatiquement (pas de "trous").

3. **Récapitulatif dynamique** sous la liste :
   - Nombre total de mois sélectionnés
   - Détail : "X mois d'arriérés + Y mois d'avance"
   - Montant total dû (somme des montants de chaque échéance, en tenant compte des paiements partiels déjà effectués)

4. **Champ Montant** : pré-rempli avec le total, modifiable. Allocation séquentielle conservée (arriérés d'abord, puis futurs).

5. **Champs conservés** : date de paiement, méthode, commentaire, upload preuve (si déjà présent).

### Détails techniques

- **Source des arriérés** : `rent_payments` où `status IN ('pending','partial','late')` ET (`due_date <= today` OU `month <= currentMonth`).
- **Mois futurs proposés** : générer 12 mois à partir du mois courant + 1 ; exclure ceux déjà présents dans `rent_payments`.
- **Logique de verrouillage** :
  ```ts
  const allArrearsSelected = arrears.every(a => selected.has(a.month));
  // future month checkbox disabled when !allArrearsSelected
  ```
- **Contiguïté future** : au clic sur un mois futur, cocher tous les mois futurs antérieurs jusqu'à celui-ci.
- **Submit** : conserver la logique existante (insert manquants → allocation séquentielle des `payment_records` → update `paid_amount`/`status`). Itérer sur la liste **triée par `month` croissant** (arriérés naturellement avant les futurs).
- **État supprimés** : `monthsCount`, `customMonths`, `startMonth`, presets `[2,3,6,12]`, RadioGroup.
- **État ajoutés** : `selectedMonths: Set<string>`, `arrears: RentPayment[]`, `futureMonths: {month, due_date, rent}[]`.

### Fichier modifié
- `src/components/rent/AdvancePaymentDialog.tsx` (refonte UI + logique de sélection ; submit quasi inchangé)

### Hors scope
- Pas de migration SQL nécessaire.
- Pas de changement sur `Rents.tsx` (props inchangées).
