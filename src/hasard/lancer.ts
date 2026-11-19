import { entre, type Flux } from "./aleatoire";
import type { Expression, GroupeDes } from "./notation";

/* Le lancer lui-même. Chaque dé garde son histoire, pour que l'interface la montre :
   le premier jet écarté par une relance, la chaîne des explosions, gardé ou écarté. */

/** au-delà, une chaîne d'explosions s'arrête (sur un d2, la probabilité d'y arriver est 2^-100) */
export const EXPLOSIONS_MAX = 100;

export interface De {
  /** valeur du dé : la somme de sa chaîne */
  valeur: number;
  /** jets successifs : le premier, puis ceux ajoutés par les explosions */
  chaine: number[];
  /** premier jet, s'il a été relancé */
  relance?: number;
  garde: boolean;
}

export interface ResultatGroupe { type: "des"; groupe: GroupeDes; des: De[]; sousTotal: number }
export interface ResultatConstante { type: "constante"; signe: 1 | -1; valeur: number; sousTotal: number }
export interface Resultat { expression: Expression; termes: (ResultatGroupe | ResultatConstante)[]; total: number }

function unDe(flux: Flux, g: GroupeDes): De {
  let premier = entre(flux, 1, g.faces);
  let relance: number | undefined;
  if (g.relance !== undefined && premier <= g.relance) { relance = premier; premier = entre(flux, 1, g.faces); }
  const chaine = [premier];
  if (g.explose) {
    while (chaine[chaine.length - 1] === g.faces && chaine.length <= EXPLOSIONS_MAX) chaine.push(entre(flux, 1, g.faces));
  }
  return { valeur: chaine.reduce((a, b) => a + b, 0), chaine, relance, garde: true };
}

/** marque les dés écartés par « garder » (à égalité, le premier lancé est gardé) */
export function appliquerGarder(des: De[], g: GroupeDes) {
  if (!g.garder) return;
  const ordre = des.map((d, i) => i).sort((a, b) =>
    g.garder!.sens === "haut" ? des[b].valeur - des[a].valeur || a - b : des[a].valeur - des[b].valeur || a - b);
  const gardes = new Set(ordre.slice(0, g.garder.n));
  des.forEach((d, i) => { d.garde = gardes.has(i); });
}

export function lancer(expression: Expression, flux: Flux): Resultat {
  const termes = expression.termes.map((t) => {
    if (t.type === "constante") return { type: "constante" as const, signe: t.signe, valeur: t.valeur, sousTotal: t.signe * t.valeur };
    const des = Array.from({ length: t.nombre }, () => unDe(flux, t));
    appliquerGarder(des, t);
    const somme = des.filter((d) => d.garde).reduce((a, d) => a + d.valeur, 0);
    return { type: "des" as const, groupe: t, des, sousTotal: t.signe * somme };
  });
  return { expression, termes, total: termes.reduce((a, t) => a + t.sousTotal, 0) };
}
