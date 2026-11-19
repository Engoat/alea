import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import type { Flux } from "./aleatoire";

/* La preuve d'équité d'un tirage, en trois temps :
   1. Avant le tirage, l'appli tire une graine secrète (32 octets) et affiche son
      engagement : l'empreinte SHA-256 de la graine et de l'énoncé (la liste, les poids, le
      mode). Elle ne peut plus changer ni l'une ni l'autre sans que ça se voie.
   2. Un participant tape un mot de son choix, après avoir vu l'engagement. Le résultat dépend
      aussi de ce mot : l'organisateur ne pouvait donc pas essayer des graines à l'avance
      jusqu'à en trouver une qui l'arrange.
   3. Après le tirage, l'appli révèle la graine. Chacun peut refaire les calculs : l'empreinte
      doit correspondre à l'engagement affiché, et le tirage refait doit donner le même résultat.
   Le hasard du tirage vient d'un flux HMAC-SHA256(graine, « alea/v1/flux » ‖ mot ‖ compteur). */

export const VERSION = "alea/v1";

/** écriture stable d'un énoncé (clés triées) : la même donnée donne toujours les mêmes octets */
export function canonique(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonique).join(",")}]`;
  if (x && typeof x === "object") {
    return `{${Object.keys(x).filter((k) => (x as Record<string, unknown>)[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonique((x as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(x);
}

/** empreinte publiée avant le tirage */
export function engagement(graine: Uint8Array, enonce: unknown): string {
  return bytesToHex(sha256(concatBytes(utf8ToBytes(VERSION + "/engagement"), graine, utf8ToBytes(canonique(enonce)))));
}

/** le flux déterministe du tirage : même graine, même mot, mêmes nombres */
export function fluxEquitable(graine: Uint8Array, mot: string): Flux {
  const prefixe = concatBytes(utf8ToBytes(VERSION + "/flux"), utf8ToBytes(mot), new Uint8Array([0]));
  let bloc = new Uint8Array(0), vue = new DataView(bloc.buffer), pos = 0, compteur = 0;
  return {
    suivant() {
      if (pos + 4 > bloc.length) {
        const c = new Uint8Array(4);
        new DataView(c.buffer).setUint32(0, compteur++);
        bloc = hmac(sha256, graine, concatBytes(prefixe, c));
        vue = new DataView(bloc.buffer, bloc.byteOffset, bloc.byteLength);
        pos = 0;
      }
      const x = vue.getUint32(pos);
      pos += 4;
      return x;
    },
  };
}

export interface Preuve { version: string; engagement: string; enonce: unknown; mot: string; graine: string }

/** vérifie une preuve : l'engagement correspond, et le tirage refait donne le même résultat */
export function verifier<R>(preuve: Preuve, tirage: (flux: Flux) => R, resultatAnnonce: R): { engagementOk: boolean; resultatOk: boolean } {
  const graine = hexToBytes(preuve.graine);
  const engagementOk = engagement(graine, preuve.enonce) === preuve.engagement;
  const resultatOk = canonique(tirage(fluxEquitable(graine, preuve.mot))) === canonique(resultatAnnonce);
  return { engagementOk, resultatOk };
}
