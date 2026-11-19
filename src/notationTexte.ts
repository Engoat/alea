/* Aides d'édition de la notation, pour les boutons du clavier. */

/** retire les espaces et passe en minuscules : la position d'une erreur reste exacte */
export const nettoyer = (t: string) => t.replace(/\s+/g, "").toLowerCase();

const operateur = (t: string) => t === "" || /[+-]$/.test(t);

/** « 1 dé de plus » : si le texte finit par le même dé, on augmente son nombre ; sinon on ajoute le dé */
export function ajouterDe(texte: string, faces: number): string {
  const m = texte.match(/(^|[+-])(\d*)d(\d+)$/);
  if (m && Number(m[3]) === faces) {
    const n = m[2] === "" ? 1 : Number(m[2]);
    return texte.slice(0, texte.length - (m[2].length + 1 + String(faces).length)) + (n + 1) + "d" + faces;
  }
  return texte + (operateur(texte) ? "" : "+") + "d" + faces;
}

/** ajoute un morceau (chiffre, modificateur) à la suite du texte */
export const ajouter = (texte: string, morceau: string) => texte + morceau;

/** ajoute un opérateur, en remplaçant le précédent s'il y en a déjà un */
export function ajouterSigne(texte: string, signe: "+" | "-"): string {
  if (texte === "") return signe === "-" ? "-" : "";
  return operateur(texte) ? texte.slice(0, -1) + signe : texte + signe;
}

export const retour = (texte: string) => texte.slice(0, -1);
