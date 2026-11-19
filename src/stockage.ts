import AsyncStorage from "@react-native-async-storage/async-storage";

/* Données locales : historique des lancers, personnages et lancers favoris.
   De petites listes, gardées en JSON dans AsyncStorage (téléphone comme navigateur). */

export interface Lancer { id: string; notation: string; total: number; date: number }
export interface Personnage { id: string; nom: string }
export interface Personne { id: string; nom: string; poids: number; niveau: number }
/** une liste de noms ; `restants` : identifiants pas encore tirés dans le cycle en cours (sans remise) */
export interface Liste { id: string; nom: string; gens: Personne[]; restants?: string[] }
export interface Favori { id: string; personnageId: string; nom: string; notation: string }

const HISTORIQUE_MAX = 100;
const CLES = { historique: "alea/historique", personnages: "alea/personnages", favoris: "alea/favoris", courant: "alea/personnage-courant", listes: "alea/listes", listeCourante: "alea/liste-courante" } as const;

async function lire<T>(cle: string, defaut: T): Promise<T> {
  try {
    const brut = await AsyncStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch {
    return defaut;
  }
}
const ecrire = (cle: string, valeur: unknown) => AsyncStorage.setItem(cle, JSON.stringify(valeur)).catch(() => {});

export const identifiant = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const lireHistorique = () => lire<Lancer[]>(CLES.historique, []);
export const ecrireHistorique = (l: Lancer[]) => ecrire(CLES.historique, l.slice(0, HISTORIQUE_MAX));

export const lirePersonnages = () => lire<Personnage[]>(CLES.personnages, []);
export const ecrirePersonnages = (p: Personnage[]) => ecrire(CLES.personnages, p);

export const lireFavoris = () => lire<Favori[]>(CLES.favoris, []);
export const ecrireFavoris = (f: Favori[]) => ecrire(CLES.favoris, f);

export const lirePersonnageCourant = () => lire<string | null>(CLES.courant, null);
export const ecrirePersonnageCourant = (id: string | null) => ecrire(CLES.courant, id);

export const lireListes = () => lire<Liste[]>(CLES.listes, []);
export const ecrireListes = (l: Liste[]) => ecrire(CLES.listes, l);
export const lireListeCourante = () => lire<string | null>(CLES.listeCourante, null);
export const ecrireListeCourante = (id: string | null) => ecrire(CLES.listeCourante, id);
