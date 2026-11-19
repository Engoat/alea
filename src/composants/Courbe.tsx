import { useState } from "react";
import { View } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { couleurs } from "../theme";
import type { Loi } from "../hasard";

/* La loi de probabilité du lancer en barres : une barre par total possible. La barre du
   résultat obtenu est foncée, les autres claires. Au-delà de 120 totaux, on regroupe ; la traîne très rare est coupée (« + » à droite). */

const HAUTEUR = 120;
const BAS = 18;

/** la courbe s'arrête là où il reste moins de 0,1 % de probabilité (traîne des dés qui explosent) */
const TRAINE = 1e-3;

export function Courbe({ loi, resultat }: { loi: Loi; resultat: number }) {
  const [largeur, setLargeur] = useState(0);
  // fin de la partie affichée : on coupe la traîne, sauf si le résultat obtenu s'y trouve
  let reste = 0, fin = loi.p.length - 1;
  while (fin > 0 && reste + loi.p[fin] < TRAINE) reste += loi.p[fin--];
  fin = Math.max(fin, Math.min(loi.p.length - 1, resultat - loi.min));
  const coupee = fin < loi.p.length - 1;
  const n = fin + 1;
  const paquet = Math.ceil(n / 120);
  const barres: { x0: number; x1: number; p: number; contient: boolean }[] = [];
  for (let i = 0; i < n; i += paquet) {
    let p = 0;
    for (let j = i; j < Math.min(n, i + paquet); j++) p += loi.p[j];
    barres.push({ x0: loi.min + i, x1: loi.min + Math.min(n, i + paquet) - 1, p, contient: resultat >= loi.min + i && resultat <= loi.min + Math.min(n, i + paquet) - 1 });
  }
  const max = Math.max(...barres.map((b) => b.p), 1e-12);
  const w = largeur / barres.length;
  return (
    <View onLayout={(e) => setLargeur(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {largeur > 0 && (
        <Svg width={largeur} height={HAUTEUR + BAS}>
          {barres.map((b, i) => {
            const h = (b.p / max) * (HAUTEUR - 6);
            return <Rect key={i} x={i * w + Math.min(1, w * 0.15)} y={HAUTEUR - h} width={Math.max(1, w - Math.min(2, w * 0.3))} height={Math.max(h, b.p > 0 ? 1 : 0)} fill={b.contient ? couleurs.encre : couleurs.filet} />;
          })}
          <Line x1={0} x2={largeur} y1={HAUTEUR} y2={HAUTEUR} stroke={couleurs.encre2} strokeWidth={1} />
          <SvgText x={0} y={HAUTEUR + 13} fontSize={11} fontFamily="sans-serif" fill={couleurs.encre2}>{loi.min}</SvgText>
          <SvgText x={largeur} y={HAUTEUR + 13} fontSize={11} fontFamily="sans-serif" fill={couleurs.encre2} textAnchor="end">{loi.min + n - 1}{coupee ? "+" : ""}</SvgText>
        </Svg>
      )}
    </View>
  );
}
