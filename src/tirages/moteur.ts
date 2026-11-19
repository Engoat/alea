import { equipes, ordre, pileOuFace, tirerPlusieurs, tirerSansRemise, tirerUn, type Flux, type Partage } from "../hasard";
import type { Personne } from "../stockage";

/* Relie l'écran des tirages aux fonctions de tirage du moteur de hasard. Une demande en
   entrée, une issue en sortie : rien d'autre ne dépend du flux de hasard. */

export type Demande =
  | { mode: "un"; sansRemise?: { restants: string[] } }
  | { mode: "plusieurs"; k: number }
  | { mode: "ordre" }
  | { mode: "equipes"; n: number }
  | { mode: "pile" };

export type Issue =
  | { mode: "un"; index: number; restants?: string[]; nouveauCycle?: boolean }
  | { mode: "plusieurs"; indices: number[] }
  | { mode: "ordre"; indices: number[] }
  | { mode: "equipes"; partage: Partage }
  | { mode: "pile"; face: 0 | 1 };

export type CodeErreur = "aucun" | "deux" | "trop";

/** vérifie qu'une demande est possible avec cette liste ; renvoie le code d'erreur sinon */
export function verifier(d: Demande, gens: readonly Personne[]): CodeErreur | null {
  if (d.mode === "pile") return null;
  if (gens.length === 0) return "aucun";
  if (d.mode === "equipes") return gens.length < 2 ? "deux" : d.n > gens.length ? "trop" : null;
  if (d.mode === "plusieurs") return d.k > gens.length ? "trop" : null;
  return null;
}

export function executer(d: Demande, gens: readonly Personne[], flux: Flux): Issue {
  const erreur = verifier(d, gens);
  if (erreur) throw new RangeError(erreur);
  switch (d.mode) {
    case "un": {
      if (d.sansRemise) {
        const ids = gens.map((g) => g.id);
        const restants = d.sansRemise.restants.filter((id) => ids.includes(id));
        const r = tirerSansRemise(flux, ids, restants);
        return { mode: "un", index: ids.indexOf(r.tire), restants: r.restants, nouveauCycle: r.nouveauCycle };
      }
      return { mode: "un", index: tirerUn(flux, gens.length, gens.map((g) => g.poids)) };
    }
    case "plusieurs":
      return { mode: "plusieurs", indices: tirerPlusieurs(flux, gens.length, d.k, gens.map((g) => g.poids)) };
    case "ordre":
      return { mode: "ordre", indices: ordre(flux, gens.length) };
    case "equipes":
      return { mode: "equipes", partage: equipes(flux, gens.map((g) => g.niveau), d.n) };
    case "pile":
      return { mode: "pile", face: pileOuFace(flux) };
  }
}

/** noms collés d'un coup : séparés par des virgules, points-virgules ou retours à la ligne */
export const lireNoms = (texte: string): string[] =>
  texte.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean);
