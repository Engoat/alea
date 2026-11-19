/* La source de hasard d'Aléa. Tout tirage passe par un flux d'entiers de 32 bits :
   - en usage normal, le générateur cryptographique du système (voir systeme.ts) ;
   - pour un tirage vérifiable, un flux déterministe dérivé d'une graine (voir equite.ts).
   Ce fichier ne dépend de rien : il tourne dans l'appli comme dans un script Node. */

/** un flux d'entiers uniformes sur [0, 2^32) */
export interface Flux {
  suivant(): number;
}

const DEUX_32 = 0x1_0000_0000;

/**
 * Entier uniforme dans [0, n), sans biais. Un simple « modulo » favoriserait les petites
 * valeurs quand 2^32 n'est pas un multiple de n : on rejette les tirages qui tombent au-delà
 * du plus grand multiple de n (au pire, moins d'un tirage sur deux est rejeté).
 */
export function entier(flux: Flux, n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > DEUX_32) throw new RangeError(`borne invalide : ${n}`);
  if (n === 1) return 0;
  const limite = DEUX_32 - (DEUX_32 % n);
  for (;;) {
    const x = flux.suivant();
    if (x < limite) return x % n;
  }
}

/** entier uniforme dans [min, max] (bornes comprises) */
export const entre = (flux: Flux, min: number, max: number) => min + entier(flux, max - min + 1);

/** mélange uniforme (Fisher-Yates), sur une copie */
export function melanger<T>(flux: Flux, liste: readonly T[]): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = entier(flux, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** flux lu dans un tampon d'octets qui se remplit à la demande */
export function fluxDepuisOctets(remplir: (tampon: Uint8Array) => void, taille = 256): Flux {
  const tampon = new Uint8Array(taille);
  const vue = new DataView(tampon.buffer);
  let pos = taille;
  return {
    suivant() {
      if (pos + 4 > taille) { remplir(tampon); pos = 0; }
      const x = vue.getUint32(pos);
      pos += 4;
      return x;
    },
  };
}
