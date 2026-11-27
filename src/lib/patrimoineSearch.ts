/**
 * Recherche d'un patrimoine dans la liste (onglets Actifs / Carte / Vendus).
 *
 * Un actif doit pouvoir être retrouvé par le nom du titulaire, pas seulement
 * par son titre ou sa localité : les gérants raisonnent d'abord par personne.
 * La recherche ignore les accents et la casse, et accepte plusieurs mots
 * ("kouassi bingerville") qui doivent tous se retrouver sur l'actif.
 */

export type AssetHolderRef = { id?: string; full_name?: string | null } | null | undefined;

export type SearchableAsset = {
  title?: string | null;
  locality?: string | null;
  subdivision_name?: string | null;
  land_title?: string | null;
  handling_firm?: string | null;
  description?: string | null;
  receipt_order_number?: string | null;
  block_number?: string | null;
  plot_number?: string | null;
  holder_id?: string | null;
  asset_holders?: AssetHolderRef;
};

/** Minuscules, sans accents, espaces normalisés. */
export function normalizeSearchText(value?: string | null): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nom du titulaire de l'actif, résolu depuis la liste complète si possible. */
export function assetHolderName(
  asset: SearchableAsset,
  holders: { id: string; full_name: string }[] = []
): string {
  const fromList = holders.find(h => h.id === asset.holder_id)?.full_name;
  return fromList || asset.asset_holders?.full_name || "";
}

/** Tous les textes où l'on cherche. */
export function assetSearchText(
  asset: SearchableAsset,
  holders: { id: string; full_name: string }[] = []
): string {
  const holderName = assetHolderName(asset, holders);
  return [
    asset.title,
    asset.locality,
    asset.subdivision_name,
    asset.land_title,
    asset.handling_firm,
    asset.description,
    asset.receipt_order_number,
    asset.block_number ? `ilot ${asset.block_number}` : "",
    asset.plot_number ? `lot ${asset.plot_number}` : "",
    holderName,
  ]
    .map(normalizeSearchText)
    .join(" ");
}

/**
 * Vrai si chaque mot de la recherche apparaît quelque part sur l'actif.
 * Une recherche vide correspond à tout.
 */
export function assetMatchesSearch(
  asset: SearchableAsset,
  query: string,
  holders: { id: string; full_name: string }[] = []
): boolean {
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = assetSearchText(asset, holders);
  return terms.every(term => haystack.includes(term));
}

/** Idem pour l'onglet Titulaires (nom, téléphone, email, adresse). */
export function holderMatchesSearch(
  holder: { full_name?: string | null; phone?: string | null; email?: string | null; address?: string | null },
  query: string
): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const haystack = [holder.full_name, holder.email, holder.address].map(normalizeSearchText).join(" ");
  return haystack.includes(q) || (holder.phone || "").includes(q);
}
