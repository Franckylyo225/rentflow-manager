## Objectif

Améliorer l'import Excel du Patrimoine pour :
1. Importer plus de champs : **titulaire**, **N° Ilot**, **N° Lot**, ville, date de création, état de traitement.
2. **Aperçu éditable** ligne par ligne pour compléter les manques avant import.
3. Bouton **« Consolider »** : reconnaît les titulaires existants et crée automatiquement les nouveaux.
4. Ajouter les nouveaux champs **N° Ilot / N° Lot** au formulaire manuel.

## 1. Migration SQL

Ajout de deux colonnes à `patrimony_assets` :

```sql
ALTER TABLE public.patrimony_assets
  ADD COLUMN block_number text NOT NULL DEFAULT '',
  ADD COLUMN plot_number  text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_patrimony_assets_block_plot
  ON public.patrimony_assets (organization_id, block_number, plot_number);
```

Aucun changement de RLS/GRANTs (déjà en place sur la table).

## 2. Import Excel — `src/components/patrimoine/PatrimoineExcelImport.tsx`

### Nouveau mapping de colonnes
Ajouter à `EXPECTED_COLUMNS` + `COLUMN_MAP` (avec alias FR usuels) :

| Colonne Excel | Champ |
|---|---|
| Nom et prénoms / Titulaire | `holder_name` (+ `holder_phone`, `holder_email`) |
| Lotissement | `locality` |
| N° Ilot / Ilot | `block_number` |
| N° Lot / Lot | `plot_number` |
| N° Ordre de recette | `receipt_order_number` |
| Date création | `title_creation_date` |
| État de traitement | `description` |
| Ville | `city_name` |

Parsing dates : accepter sériel Excel (nombre), `JJ/MM/AAAA`, `AAAA-MM-JJ`.
Nettoyage Ilot/Lot : retirer préfixes (`"Lot n°45"` → `"45"`).

### Aperçu éditable
Remplacer la table en lecture seule par une grille éditable :
- `Input` pour titre, ilot, lot, lotissement, titre foncier, titulaire (nom + téléphone), description ;
- `Select` pour type d'actif et ville (résolue contre `cities` de l'org) ;
- bouton « Supprimer la ligne ».
- Badges erreurs (titre manquant, doublons) conservés.

### Reconnaissance des titulaires
Au chargement du fichier, charger aussi `asset_holders` de l'org.
Pour chaque ligne avec `holder_name` :
- match par **nom normalisé** (trim, casse) → `_holderMatch = { id, source: 'db' }`
- sinon match par **téléphone** → idem
- sinon → `_holderMatch = { source: 'new' }`

Badge par ligne : « Titulaire reconnu » (vert) / « Nouveau titulaire » (bleu) / « Sans titulaire » (gris).

### Filtres dans l'aperçu
Barre au-dessus de la table avec :
- recherche texte (titre / lotissement / titulaire / N° Ilot / N° Lot) ;
- filtre statut titulaire : Tous / Reconnus / Nouveaux / Sans ;
- filtre erreur : Tous / Valides / Doublons / Erreurs.

### Bouton « Consolider »
Nouveau bouton dans le footer (avant « Importer ») :
1. Regroupe les `holder_name` marqués `new` (dédupliqués par nom normalisé) ;
2. `insert` en lot dans `asset_holders` (nom + phone + email + `organization_id`) ;
3. Met à jour les `_holderMatch` des lignes correspondantes ;
4. Toast : « X titulaire(s) créé(s), Y reconnu(s) ».

Tant qu'il reste des titulaires `new` non consolidés, le bouton « Importer » est désactivé.

### Insertion finale
Inclure dans le payload : `block_number`, `plot_number`, `holder_id`, `city_id` (résolu via `city_name`), `title_creation_date`, `description`.

### Modèle Excel
Mise à jour de `downloadTemplate` avec les nouvelles colonnes et un exemple complet.

## 3. Formulaire manuel — `src/pages/Patrimoine.tsx`

- Ajouter `block_number` et `plot_number` dans `form` initial, `resetForm`, `openEdit`, `handleSave`, `handleEdit`.
- Ajouter deux `Input` côte à côte dans `assetFormDialog`, juste après « Lotissement / Nom du lotissement » :
  - « N° Ilot »
  - « N° Lot »

## 4. Affichage liste / détail
- Page liste patrimoine : afficher discrètement `Ilot X · Lot Y` sous le titre quand renseignés.
- Page `PatrimoineDetail.tsx` : ajouter les deux champs dans la section « Informations foncières ».

## Hors périmètre
- Pas de changement d'enum sur l'état de traitement (reste texte libre dans `description`).
- Pas d'import des contacts ou documents.
