import { bytesToHex } from "@noble/hashes/utils.js";
import { engagement, fluxEquitable, verifier, VERSION, type Flux, type Preuve } from "../hasard";
import { nouvelleGraine } from "../hasard/systeme";
import { executer, type Demande, type Issue } from "./moteur";
import type { Personne } from "../stockage";

/* Les tirages vérifiables (voir hasard/equite.ts pour le principe) :
   1. preparer()  : graine secrète + engagement, publié avant le tirage ;
   2. reveler()   : le participant a tapé un mot, le tirage est fait, la preuve est complète ;
   3. controler() : n'importe qui, avec la preuve seule, refait le calcul. */

/** tout ce dont le tirage dépend : la demande et les noms, avec leurs poids et leurs niveaux */
export interface Enonce {
  demande: Demande;
  gens: { nom: string; poids: number; niveau: number }[];
}

export interface PreuveTirage extends Preuve { enonce: Enonce; resultat: Issue }

export interface Preparation { graine: Uint8Array; engagement: string; enonce: Enonce }

export const enonceDe = (demande: Demande, gens: readonly Personne[]): Enonce => ({
  demande,
  gens: gens.map((g) => ({ nom: g.nom, poids: g.poids, niveau: g.niveau })),
});

/** refait le tirage d'un énoncé avec un flux donné (les identifiants n'ont pas d'importance) */
export const rejouer = (e: Enonce, flux: Flux): Issue =>
  executer(e.demande, e.gens.map((g, i) => ({ ...g, id: String(i) })), flux);

export function preparer(demande: Demande, gens: readonly Personne[]): Preparation {
  const enonce = enonceDe(demande, gens);
  const graine = nouvelleGraine();
  return { graine, engagement: engagement(graine, enonce), enonce };
}

export function reveler(prep: Preparation, mot: string): PreuveTirage {
  const m = mot.trim();
  return {
    version: VERSION,
    engagement: prep.engagement,
    enonce: prep.enonce,
    mot: m,
    graine: bytesToHex(prep.graine),
    resultat: rejouer(prep.enonce, fluxEquitable(prep.graine, m)),
  };
}

export type Controle =
  | { ok: true; engagementOk: boolean; resultatOk: boolean; recalcule: Issue; enonce: Enonce }
  | { ok: false };

/** contrôle une preuve reçue (texte JSON ou objet) ; `ok: false` si elle est illisible */
export function controler(brut: string | unknown): Controle {
  try {
    const p = (typeof brut === "string" ? JSON.parse(brut) : brut) as PreuveTirage;
    if (!p || p.version !== VERSION || typeof p.graine !== "string" || !/^[0-9a-f]{64}$/i.test(p.graine) || typeof p.mot !== "string"
      || typeof p.engagement !== "string" || !p.enonce || !Array.isArray(p.enonce.gens) || !p.resultat) return { ok: false };
    const r = verifier(p, (flux) => rejouer(p.enonce, flux), p.resultat);
    const graine = Uint8Array.from(p.graine.match(/../g)!.map((h) => parseInt(h, 16)));
    const recalcule = rejouer(p.enonce, fluxEquitable(graine, p.mot));
    return { ok: true, ...r, recalcule, enonce: p.enonce };
  } catch {
    return { ok: false };
  }
}

/** l'empreinte par groupes de 8 caractères, plus facile à lire et à comparer */
export const groupes = (hex: string) => hex.match(/.{1,8}/g)?.join(" ") ?? hex;
