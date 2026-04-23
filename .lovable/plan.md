

## Plan : Mettre un actif du patrimoine en location

### Objectif
Ajouter une case à cocher "Mettre en location" dans les formulaires d'actifs du patrimoine (création + édition). Lorsqu'elle est cochée, un enregistrement correspondant est automatiquement créé dans la table **properties** (module Biens), prêt à recevoir des unités.

### Comportement métier

- Case à cocher **"Mettre ce bien en location"** dans le formulaire d'actif.
- Visible uniquement pour les types d'actif compatibles : `maison`, `autre` (un terrain nu n'est pas mis en location).
- Si cochée :
  - Champ supplémentaire requis : **Ville** (Select sur `cities` de l'organisation, avec bouton "Nouvelle ville" inline).
  - Type de bien Properties pré-rempli selon `asset_type` (`maison` → `villa`, `autre` → `immeuble`, modifiable).
- À la sauvegarde de l'actif :
  - Création (ou mise à jour si déjà lié) d'un enregistrement `properties` avec `name = asset.title`, `address = locality + subdivision_name`, `description` reprise de l'actif.
  - Lien stocké via une nouvelle colonne `properties.patrimony_asset_id` (FK vers `patrimony_assets.id`, nullable, unique).
- Sur la page **PatrimoineDetail** : badge "En location" + bouton "Gérer le bien locatif" qui redirige vers `/properties/{id}` du bien lié.
- Sur la page **Properties** : badge discret "Issu du patrimoine" sur les biens liés (info-bulle vers l'actif source).
- Décocher la case sur un actif déjà lié : on **ne supprime pas** le bien locatif (peut contenir des unités/locataires) — un toast informe et propose d'aller le supprimer manuellement depuis la page Biens.

### Modifications base de données

```sql
ALTER TABLE public.properties 
  ADD COLUMN patrimony_asset_id uuid UNIQUE REFERENCES public.patrimony_assets(id) ON DELETE SET NULL;

CREATE INDEX idx_properties_patrimony_asset ON public.properties(patrimony_asset_id);
```

Aucun changement RLS nécessaire (les policies existantes sur `properties` couvrent l'organisation).

### UI

**1. `src/pages/Patrimoine.tsx`** — `assetFormDialog`
- Ajout après la section description :
  - `<Checkbox>` "Mettre ce bien en location"
  - Bloc conditionnel : Select Ville (+ bouton nouvelle ville réutilisant le pattern existant) + Select Type de bien locatif.
- État form étendu : `for_rent: boolean`, `rental_city_id: string`, `rental_property_type: string`.
- En édition : pré-charger l'état depuis un fetch préalable du `properties` lié (`.eq("patrimony_asset_id", asset.id)`).

**2. Logique `handleSave` / `handleEdit`**
- Après insert/update de l'actif, si `for_rent === true` :
  - Vérifier existence d'un `properties` lié.
  - Insert ou update avec `patrimony_asset_id`, `city_id`, `name`, `type`, `address`, `description`, `organization_id`.
- Si `for_rent === false` et un bien était lié : toast d'avertissement (pas de suppression auto).

**3. `src/pages/PatrimoineDetail.tsx`**
- Fetch additionnel : `properties` lié via `patrimony_asset_id`.
- Si présent : badge "En location" dans le header + bouton "Gérer le bien locatif" → `navigate('/properties/' + linkedProperty.id)`.

**4. `src/pages/Properties.tsx`**
- Affichage discret d'un badge "Patrimoine" sur les cartes/lignes des biens où `patrimony_asset_id` est défini.

### Détails techniques

- **Idempotence** : la contrainte UNIQUE sur `patrimony_asset_id` garantit qu'un actif ne peut être lié qu'à un seul bien locatif. Logique : `upsert` sur `patrimony_asset_id`.
- **Données par défaut** : `address` = `${locality}${subdivision_name ? ' · ' + subdivision_name : ''}`, modifiable ensuite depuis Properties.
- **Mapping type d'actif → type de bien** :
  - `maison` → `villa`
  - `terrain` → option masquée (pas de mise en location)
  - `titre` → option masquée
  - `autre` → `immeuble` (par défaut, modifiable)
- **Hooks impactés** : `useProperties` continue de retourner tous les biens — pas de changement nécessaire car `patrimony_asset_id` est juste une colonne supplémentaire ; le type Database est régénéré automatiquement.

### Fichiers impactés

- **DB migration** : ajout colonne `properties.patrimony_asset_id`
- **Modifiés** :
  - `src/pages/Patrimoine.tsx` — checkbox + champs conditionnels + logique save/edit
  - `src/pages/PatrimoineDetail.tsx` — badge + bouton de navigation vers le bien locatif
  - `src/pages/Properties.tsx` — badge "Patrimoine"
- **Mémoire** : note sur le lien patrimoine ↔ properties dans `mem://features/gestion-patrimoine`

