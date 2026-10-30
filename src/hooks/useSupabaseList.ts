import { useQuery, type QueryKey } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Socle commun des hooks de données.
 *
 * Auparavant chaque hook gardait ses résultats dans son propre `useState` : deux
 * composants demandant la même table déclenchaient deux requêtes identiques, et
 * tout était rechargé à chaque changement de page. En passant par React Query,
 * une même `queryKey` n'est chargée qu'une fois et partagée par tous ses
 * consommateurs, puis réutilisée en naviguant.
 *
 * L'interface `{ data, loading, refetch }` est conservée telle quelle pour que
 * les pages n'aient pas à changer.
 */

const EMPTY: never[] = [];

export interface ListOptions {
  /** Permet de différer la requête, par exemple jusqu'à l'ouverture d'un panneau. */
  enabled?: boolean;
}

export function useSupabaseList<T>(
  key: QueryKey,
  fetcher: () => Promise<T[]>,
  options?: ListOptions
) {
  const { user } = useAuth();
  const enabled = (options?.enabled ?? true) && !!user;

  const { data, isLoading, refetch } = useQuery({
    // L'id utilisateur fait partie de la clé : changer de compte ne doit jamais
    // laisser voir les données du précédent.
    queryKey: [...(key as unknown[]), user?.id],
    queryFn: fetcher,
    enabled,
  });

  // `EMPTY` est une constante partagée : renvoyer `[]` à chaque rendu créerait
  // une nouvelle référence et relancerait les `useMemo` des pages pour rien.
  return { data: (data ?? EMPTY) as T[], loading: isLoading, refetch };
}
