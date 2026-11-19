import { getRandomValues } from "expo-crypto";
import { fluxDepuisOctets, type Flux } from "./aleatoire";

/** le générateur cryptographique du système, fourni par expo-crypto */
export const fluxSysteme = (): Flux => fluxDepuisOctets((t) => { getRandomValues(t); });

/** une graine secrète de 32 octets, pour un tirage vérifiable */
export const nouvelleGraine = (): Uint8Array => getRandomValues(new Uint8Array(32));
