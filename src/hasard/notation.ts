/* Lecture de la notation des dés, celle des jeux de rôle :
     3d6+2      trois dés à six faces, plus 2
     4d6kh3     quatre d6, on garde les trois meilleurs (kl : les moins bons)
     4d6dl1     quatre d6, on écarte le moins bon (dh : le meilleur)
     2d20kh1    avantage ; 2d20kl1 : désavantage
     d6!        le dé explose : sur un 6, on relance et on ajoute
     d20r1      un résultat de 1 ou moins est relancé une fois
     d%         dé de pourcentage (d100)
   Grammaire : expression = terme (("+" | "-") terme)* ; terme = dés | entier. */

export const LIMITES = { des: 100, faces: 1000, constante: 1_000_000, termes: 20 } as const;

export interface GroupeDes {
  type: "des";
  signe: 1 | -1;
  nombre: number;
  faces: number;
  /** garder les n meilleurs (haut) ou les n moins bons (bas) */
  garder?: { sens: "haut" | "bas"; n: number };
  /** sur la plus haute face, on relance et on ajoute */
  explose: boolean;
  /** un premier jet inférieur ou égal à ce seuil est relancé une fois */
  relance?: number;
  texte: string;
}
export interface Constante { type: "constante"; signe: 1 | -1; valeur: number; texte: string }
export type Terme = GroupeDes | Constante;
export interface Expression { termes: Terme[]; texte: string }

export type CodeErreur =
  | "vide" | "caractere" | "signe_attendu" | "terme_attendu" | "faces_attendues"
  | "trop_de_des" | "zero_de" | "faces_hors_limites" | "constante_trop_grande" | "trop_de_termes"
  | "garder_hors_limites" | "relance_hors_limites" | "modificateur_double";

/** erreur de notation : un code (traduit par l'interface), sa position dans le texte, des paramètres */
export class ErreurNotation extends Error {
  constructor(public code: CodeErreur, public position: number, public params: Record<string, string | number> = {}) {
    super(`${code} @${position}`);
  }
}

export function lire(source: string): Expression {
  const s = source.replace(/\s+/g, "").toLowerCase();
  if (!s) throw new ErreurNotation("vide", 0);
  let i = 0;

  const entier = (): number | null => {
    const debut = i;
    while (i < s.length && s[i] >= "0" && s[i] <= "9") i++;
    return i > debut ? Number(s.slice(debut, i)) : null;
  };

  function terme(signe: 1 | -1): Terme {
    const debut = i;
    const n = entier();
    if (s[i] !== "d") {
      if (n === null) throw new ErreurNotation("terme_attendu", i);
      if (n > LIMITES.constante) throw new ErreurNotation("constante_trop_grande", debut, { max: LIMITES.constante });
      return { type: "constante", signe, valeur: n, texte: s.slice(debut, i) };
    }
    i++; // le « d »
    const nombre = n ?? 1;
    if (nombre === 0) throw new ErreurNotation("zero_de", debut);
    if (nombre > LIMITES.des) throw new ErreurNotation("trop_de_des", debut, { max: LIMITES.des });
    let faces: number | null;
    if (s[i] === "%") { i++; faces = 100; } else faces = entier();
    if (faces === null) throw new ErreurNotation("faces_attendues", i);
    if (faces < 2 || faces > LIMITES.faces) throw new ErreurNotation("faces_hors_limites", debut, { max: LIMITES.faces });

    const g: GroupeDes = { type: "des", signe, nombre, faces, explose: false, texte: "" };
    // modificateurs, dans n'importe quel ordre, chacun une fois
    for (;;) {
      const pos = i;
      if (s.startsWith("kh", i) || s.startsWith("kl", i) || s.startsWith("dh", i) || s.startsWith("dl", i) || (s[i] === "k" && /[0-9]/.test(s[i + 1] ?? ""))) {
        if (g.garder) throw new ErreurNotation("modificateur_double", pos);
        // « k3 » s'écrit aussi pour « kh3 »
        const mode = /[0-9]/.test(s[i + 1] ?? "") ? "kh" : s.slice(i, i + 2);
        i += s[i + 1] === "h" || s[i + 1] === "l" ? 2 : 1;
        const k = entier() ?? 1;
        const garde = mode[0] === "k", haut = mode[1] === "h";
        // « écarter les k moins bons » = « garder les nombre − k meilleurs »
        const n2 = garde ? k : nombre - k;
        if (k < 1 || n2 < 1 || n2 > nombre) throw new ErreurNotation("garder_hors_limites", pos, { max: garde ? nombre : nombre - 1 });
        g.garder = { sens: garde === haut ? "haut" : "bas", n: n2 };
      } else if (s[i] === "!") {
        if (g.explose) throw new ErreurNotation("modificateur_double", pos);
        i++;
        g.explose = true;
      } else if (s[i] === "r") {
        if (g.relance !== undefined) throw new ErreurNotation("modificateur_double", pos);
        i++;
        const seuil = entier() ?? 1;
        if (seuil < 1 || seuil >= faces) throw new ErreurNotation("relance_hors_limites", pos, { max: faces - 1 });
        g.relance = seuil;
      } else break;
    }
    g.texte = s.slice(debut, i);
    return g;
  }

  const termes: Terme[] = [];
  let signe: 1 | -1 = 1;
  if (s[0] === "-" || s[0] === "+") { signe = s[0] === "-" ? -1 : 1; i++; }
  for (;;) {
    termes.push(terme(signe));
    if (termes.length > LIMITES.termes) throw new ErreurNotation("trop_de_termes", i, { max: LIMITES.termes });
    if (i >= s.length) break;
    if (s[i] !== "+" && s[i] !== "-") throw new ErreurNotation(/[0-9a-z%!]/.test(s[i]) ? "signe_attendu" : "caractere", i, { caractere: s[i] });
    signe = s[i] === "-" ? -1 : 1;
    i++;
    if (i >= s.length) throw new ErreurNotation("terme_attendu", i);
  }
  return { termes, texte: s };
}
