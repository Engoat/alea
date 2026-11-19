import { entier, melanger, type Flux } from "./aleatoire";

/* Les tirages au sort. Chaque fonction ne dépend que du flux de hasard qu'on lui donne :
   avec un flux équitable (equite.ts), le même énoncé redonne toujours le même résultat,
   ce qui rend le tirage vérifiable. Les poids sont des entiers, pour rester exacts. */

/** un nom tiré, avec des chances proportionnelles aux poids (tous égaux par défaut) */
export function tirerUn(flux: Flux, n: number, poids?: readonly number[]): number {
  if (n < 1) throw new RangeError("liste vide");
  if (!poids) return entier(flux, n);
  if (poids.length !== n || poids.some((w) => !Number.isInteger(w) || w < 0)) throw new RangeError("poids invalides");
  const total = poids.reduce((a, b) => a + b, 0);
  if (total < 1) throw new RangeError("poids tous nuls");
  let r = entier(flux, total);
  for (let i = 0; i < n; i++) { r -= poids[i]; if (r < 0) return i; }
  return n - 1;
}

/** k noms distincts, dans l'ordre du tirage (pondéré : les poids des tirés sortent du jeu) */
export function tirerPlusieurs(flux: Flux, n: number, k: number, poids?: readonly number[]): number[] {
  if (k > n) throw new RangeError("plus de tirés que de noms");
  const restants = Array.from({ length: n }, (_, i) => i);
  const w = poids ? [...poids] : undefined;
  const tires: number[] = [];
  for (let t = 0; t < k; t++) {
    const j = tirerUn(flux, restants.length, w);
    tires.push(restants[j]);
    restants.splice(j, 1);
    w?.splice(j, 1);
  }
  return tires;
}

/** ordre de passage : une permutation uniforme */
export const ordre = (flux: Flux, n: number): number[] => melanger(flux, Array.from({ length: n }, (_, i) => i));

/** pile (0) ou face (1) */
export const pileOuFace = (flux: Flux): 0 | 1 => entier(flux, 2) as 0 | 1;

/**
 * Tirage sans remise sur plusieurs séances : personne ne repasse avant que tous soient
 * passés. L'état (les noms pas encore tirés de ce cycle) est gardé entre les séances.
 */
export function tirerSansRemise(flux: Flux, tous: readonly string[], restants: readonly string[]): { tire: string; restants: string[]; nouveauCycle: boolean } {
  const nouveauCycle = restants.length === 0;
  const pool = nouveauCycle ? [...tous] : [...restants];
  const j = entier(flux, pool.length);
  const tire = pool[j];
  pool.splice(j, 1);
  return { tire, restants: pool, nouveauCycle };
}

/**
 * Équipes équilibrées : chacun a un niveau (entier), les tailles d'équipe diffèrent au plus
 * d'une personne. D'abord une recherche locale : on mélange (les égalités se départagent au
 * hasard), on distribue en serpentin du plus fort au moins fort, puis on échange ou déplace
 * des joueurs tant que les sommes se rapprochent. Jusqu'à 16 personnes, une recherche
 * exhaustive garantit ensuite le meilleur partage (optimal = true). Au-delà, le résultat de la
 * recherche locale est rendu tel quel, avec son écart.
 */
export function equipes(flux: Flux, niveaux: readonly number[], nbEquipes: number): Partage {
  if (nbEquipes < 2 || nbEquipes > niveaux.length) throw new RangeError("nombre d'équipes invalide");
  const local = unPartage(flux, niveaux, nbEquipes);
  if (niveaux.length > EXHAUSTIF_MAX || local.ecart === 0) return { ...local, optimal: local.ecart === 0 };
  return exhaustif(flux, niveaux, nbEquipes, local);
}

export interface Partage { equipes: number[][]; sommes: number[]; ecart: number; optimal: boolean }

/** jusqu'à ce nombre de personnes, on cherche le meilleur partage par recherche exhaustive */
export const EXHAUSTIF_MAX = 16;
const NOEUDS_MAX = 3_000_000;

/* Recherche exhaustive avec élagage : on place les joueurs du plus fort au moins fort ;
   deux équipes dans le même état (même effectif, même somme) sont interchangeables, on n'en
   essaie qu'une ; on abandonne une branche qui ne peut plus battre le meilleur écart connu.
   Si la recherche dépasse NOEUDS_MAX étapes, on garde le meilleur trouvé (optimal = false). */
function exhaustif(flux: Flux, niveaux: readonly number[], T: number, depart: Omit<Partage, "optimal">): Partage {
  const n = niveaux.length, base = Math.floor(n / T), grandes = n % T;
  const ordreJ = melanger(flux, niveaux.map((_, i) => i)).sort((a, b) => niveaux[b] - niveaux[a]);
  const total = niveaux.reduce((a, b) => a + b, 0), cible = total / T;
  const s = new Array<number>(T).fill(0), c = new Array<number>(T).fill(0), place = new Array<number>(n);
  let meilleur = depart.ecart, solution: number[] | null = null, noeuds = 0, complet = true;
  let restant = total;

  const rec = (k: number) => {
    if (++noeuds > NOEUDS_MAX) { complet = false; return; }
    if (k === n) {
      const e = Math.max(...s) - Math.min(...s);
      if (e < meilleur) { meilleur = e; solution = [...place]; }
      return;
    }
    // borne : l'écart final ne peut pas descendre sous ce que la plus forte a déjà de trop
    // au-dessus de la moyenne, ni sous ce que la plus faible ne pourra plus rattraper
    const borne = Math.max(0, Math.max(...s) - cible) + Math.max(0, cible - (Math.min(...s) + restant));
    if (borne >= meilleur) return;
    const j = ordreJ[k], v = niveaux[j];
    const nbGrandes = c.filter((x) => x > base).length;
    const vus = new Set<string>();
    for (let t = 0; t < T; t++) {
      const max = base + (c[t] > base || nbGrandes < grandes ? 1 : 0);
      if (c[t] >= max) continue;
      const etat = `${c[t]}:${s[t]}`;
      if (vus.has(etat)) continue;
      vus.add(etat);
      s[t] += v; c[t]++; restant -= v; place[k] = t;
      rec(k + 1);
      s[t] -= v; c[t]--; restant += v;
      if (meilleur === 0 && solution) return;
    }
  };
  rec(0);
  if (!solution) return { ...depart, optimal: complet };
  const eq: number[][] = Array.from({ length: T }, () => []);
  (solution as number[]).forEach((t, k) => eq[t].push(ordreJ[k]));
  const sommes = eq.map((e) => e.reduce((a, j) => a + niveaux[j], 0));
  return { equipes: eq, sommes, ecart: meilleur, optimal: complet };
}

function unPartage(flux: Flux, niveaux: readonly number[], nbEquipes: number): Omit<Partage, "optimal"> {
  const ordreJoueurs = melanger(flux, niveaux.map((_, i) => i)).sort((a, b) => niveaux[b] - niveaux[a]);
  const eq: number[][] = Array.from({ length: nbEquipes }, () => []);
  ordreJoueurs.forEach((j, r) => {
    const tour = Math.floor(r / nbEquipes), pos = r % nbEquipes;
    eq[tour % 2 === 0 ? pos : nbEquipes - 1 - pos].push(j);
  });
  const somme = (e: number[]) => e.reduce((a, j) => a + niveaux[j], 0);
  const sommes = eq.map(somme);
  const ecartDe = (x: number[]) => Math.max(...x) - Math.min(...x);
  // on minimise la dispersion des sommes (somme des carrés des écarts à la moyenne) : une
  // mesure plus fine que « plus forte moins plus faible », qui guide mieux les échanges
  const moy = sommes.reduce((a, b) => a + b, 0) / nbEquipes;
  const dispersion = () => sommes.reduce((a, x) => a + (x - moy) ** 2, 0);
  // échanger deux joueurs, ou déplacer un joueur vers une équipe plus petite d'une personne
  for (let ameliore = true; ameliore;) {
    ameliore = false;
    for (let a = 0; a < nbEquipes; a++) for (let b = 0; b < nbEquipes; b++) {
      if (a === b) continue;
      for (let i = 0; i < eq[a].length; i++) {
        const avant = dispersion();
        if (eq[a].length > eq[b].length) {
          const d = niveaux[eq[a][i]];
          sommes[a] -= d; sommes[b] += d;
          if (dispersion() < avant - 1e-9) { eq[b].push(eq[a][i]); eq[a].splice(i, 1); ameliore = true; break; }
          sommes[a] += d; sommes[b] -= d;
        }
        for (let j = 0; j < eq[b].length; j++) {
          const d = niveaux[eq[b][j]] - niveaux[eq[a][i]];
          if (d === 0) continue;
          sommes[a] += d; sommes[b] -= d;
          if (dispersion() < avant - 1e-9) { [eq[a][i], eq[b][j]] = [eq[b][j], eq[a][i]]; ameliore = true; break; }
          sommes[a] -= d; sommes[b] += d;
        }
      }
    }
  }
  return { equipes: eq, sommes, ecart: ecartDe(sommes) };
}
