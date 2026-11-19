import type { Flux } from "./aleatoire";
import { lancer, EXPLOSIONS_MAX } from "./lancer";
import type { Expression, GroupeDes } from "./notation";

/* La loi de probabilité d'un lancer : pour chaque total possible, sa probabilité.
   Elle est calculée exactement (en nombres à virgule de 64 bits), pas estimée :
   - un dé : ses faces, corrigées par la relance ; une explosion ajoute une chaîne, coupée
     quand sa probabilité devient négligeable (la part coupée est gardée dans « reste ») ;
   - une somme de dés : par convolution ;
   - « garder les meilleurs » : par dénombrement (programmation dynamique sur les faces).
   Si le calcul exact dépasse le budget (lancers énormes), la loi du groupe est estimée par
   simulation, et le résultat le dit (exacte = false, nombre d'échantillons). */

/** p[i] est la probabilité que le total vaille min + i */
export interface Loi { min: number; p: Float64Array }
export interface LoiLancer extends Loi {
  /** probabilité non représentée (chaînes d'explosions coupées) */
  reste: number;
  exacte: boolean;
  /** nombre de lancers simulés, quand la loi d'un groupe a été estimée */
  echantillons?: number;
}

/** au-delà de ce nombre d'opérations, un groupe est estimé par simulation */
export const BUDGET = 3e7;
export const ECHANTILLONS = 20_000;
const NEGLIGEABLE = 1e-15;

const point = (v: number): Loi => ({ min: v, p: Float64Array.of(1) });

export function convoluer(a: Loi, b: Loi): Loi {
  const p = new Float64Array(a.p.length + b.p.length - 1);
  for (let i = 0; i < a.p.length; i++) {
    const x = a.p[i];
    if (x === 0) continue;
    for (let j = 0; j < b.p.length; j++) p[i + j] += x * b.p[j];
  }
  return { min: a.min + b.min, p };
}

const opposee = (l: Loi): Loi => ({ min: -(l.min + l.p.length - 1), p: l.p.slice().reverse() });

/** loi d'un seul dé du groupe (relance et explosion comprises) */
export function loiDe(g: GroupeDes): Loi {
  const s = g.faces, un = 1 / s;
  // premier jet, corrigé par la relance : sous le seuil, on relance une fois et on garde
  const face = new Float64Array(s + 1);
  const r = g.relance ?? 0;
  for (let v = 1; v <= s; v++) face[v] = (v > r ? un : 0) + (r / s) * un;
  if (!g.explose) return { min: 1, p: face.slice(1) };

  // sur la face maximale, la chaîne continue : s + Y, où Y = k·s + j (k explosions, puis j < s)
  const q = face[s];
  let k = 0;
  while (k < EXPLOSIONS_MAX && q * un ** k >= NEGLIGEABLE) k++;
  const p = new Float64Array((k + 1) * s);
  for (let v = 1; v < s; v++) p[v - 1] = face[v];
  for (let n = 0; n < k; n++) {
    const chemin = q * un ** n * un;
    for (let j = 1; j < s; j++) p[s + n * s + j - 1] += chemin;
  }
  // la plus haute valeur représentée n'est pas atteinte (chaque palier se termine sous s)
  return { min: 1, p };
}

/** binôme C(n, k), en nombre à virgule (n ≤ 100) */
const binomes: number[][] = [];
function C(n: number, k: number): number {
  if (!binomes[n]) {
    const ligne = [1];
    for (let i = 1; i <= n; i++) ligne.push((ligne[i - 1] * (n - i + 1)) / i);
    binomes[n] = ligne;
  }
  return binomes[n][k];
}

/** coût estimé du calcul exact d'un groupe, en opérations */
export function cout(g: GroupeDes): number {
  const L = loiDe(g).p.length, N = g.nombre;
  if (!g.garder || g.garder.n === N) return (N * N * L * L) / 2;
  return (L * N * N * g.garder.n * (L + 1)) / 2;
}

/** loi de la somme des dés gardés, calcul exact */
function loiGroupeExacte(g: GroupeDes): Loi {
  const de = loiDe(g), N = g.nombre;
  if (!g.garder || g.garder.n === N) {
    let l = de;
    for (let i = 1; i < N; i++) l = convoluer(l, de);
    return l;
  }
  // On parcourt les valeurs du dé de la meilleure à la moins bonne (ou l'inverse pour « bas ») :
  // les k premiers dés rencontrés sont les gardés. État : (dés déjà placés, somme des gardés).
  const k = g.garder.n;
  const valeurs: [number, number][] = [];
  de.p.forEach((p, i) => { if (p > 0) valeurs.push([de.min + i, p]); });
  if (g.garder.sens === "haut") valeurs.reverse();
  const sommeMax = k * valeurs.reduce((m, [v]) => Math.max(m, v), 0);
  let dp = Array.from({ length: N + 1 }, () => new Float64Array(sommeMax + 1));
  dp[0][0] = 1;
  for (const [v, p] of valeurs) {
    const suivant = Array.from({ length: N + 1 }, () => new Float64Array(sommeMax + 1));
    for (let u = 0; u <= N; u++) {
      const ligne = dp[u];
      for (let somme = 0; somme <= sommeMax; somme++) {
        const x = ligne[somme];
        if (x === 0) continue;
        let pc = 1; // p^c
        for (let c = 0; u + c <= N; c++) {
          const ajout = v * (Math.min(u + c, k) - Math.min(u, k));
          suivant[u + c][somme + ajout] += x * C(N - u, c) * pc;
          pc *= p;
        }
      }
    }
    dp = suivant;
  }
  // dp[N] : tous les dés placés ; la masse manquante correspond aux explosions coupées
  const fin = dp[N];
  let debut = 0;
  while (debut < fin.length - 1 && fin[debut] === 0) debut++;
  return { min: debut, p: fin.slice(debut) };
}

/** loi d'un groupe estimée par simulation */
function loiGroupeEstimee(g: GroupeDes, flux: Flux, n: number): Loi {
  const seul: Expression = { termes: [{ ...g, signe: 1 }], texte: g.texte };
  const totaux = new Map<number, number>();
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < n; i++) {
    const t = lancer(seul, flux).total;
    totaux.set(t, (totaux.get(t) ?? 0) + 1);
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const p = new Float64Array(max - min + 1);
  for (const [t, c] of totaux) p[t - min] = c / n;
  return { min, p };
}

/** loi complète d'une expression ; le flux ne sert que si un groupe doit être estimé */
export function loi(expression: Expression, flux: Flux, echantillons = ECHANTILLONS): LoiLancer {
  let l = point(0), exacte = true;
  for (const t of expression.termes) {
    if (t.type === "constante") { l = { min: l.min + t.signe * t.valeur, p: l.p }; continue; }
    let g: Loi;
    if (cout(t) <= BUDGET) g = loiGroupeExacte(t);
    else { g = loiGroupeEstimee(t, flux, echantillons); exacte = false; }
    l = convoluer(l, t.signe === 1 ? g : opposee(g));
  }
  const somme = l.p.reduce((a, b) => a + b, 0);
  return { ...l, reste: Math.max(0, 1 - somme), exacte, echantillons: exacte ? undefined : echantillons };
}

/* --- lectures de la loi --------------------------------------------------- */

export const proba = (l: Loi, x: number) => l.p[x - l.min] ?? 0;
export function auMoins(l: Loi, x: number) {
  let s = 0;
  for (let i = Math.max(0, x - l.min); i < l.p.length; i++) s += l.p[i];
  return s;
}
export function auPlus(l: Loi, x: number) {
  let s = 0;
  for (let i = 0; i <= Math.min(l.p.length - 1, x - l.min); i++) s += l.p[i];
  return s;
}
export function moyenne(l: Loi) {
  let m = 0, s = 0;
  l.p.forEach((p, i) => { m += p * (l.min + i); s += p; });
  return m / s;
}
export function ecartType(l: Loi) {
  const m = moyenne(l);
  let v = 0, s = 0;
  l.p.forEach((p, i) => { v += p * (l.min + i - m) ** 2; s += p; });
  return Math.sqrt(v / s);
}
