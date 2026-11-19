import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { G, Path, Polygon, Text as SvgText } from "react-native-svg";
import { couleurs } from "../theme";

/* La roue : une part par nom, large comme son poids. Le gagnant est déjà tiré : la roue
   tourne de plusieurs tours puis s'arrête avec la part du gagnant sous la flèche. */

interface Props {
  parts: { nom: string; poids: number }[];
  /** indice du gagnant, ou null avant le premier tirage */
  gagnant: number | null;
  lancement: number;
  animer: boolean;
  onFin: () => void;
  taille: number;
}

export const DUREE_ROUE = 3600;
const TOURS = 5;
const FILL = [couleurs.carte, "#e9e6dc"];

const polaire = (cx: number, cy: number, r: number, angle: number): [number, number] => {
  const a = (angle * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
};

export function Roue({ parts, gagnant, lancement, animer, onFin, taille }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const courant = useRef(0);
  const total = parts.reduce((a, p) => a + p.poids, 0);
  const rayon = taille / 2 - 6, cx = taille / 2, cy = taille / 2;

  // angle de début et de fin de chaque part, en degrés dans le sens des aiguilles d'une montre depuis le haut
  const angles: [number, number][] = [];
  let cumul = 0;
  for (const p of parts) { angles.push([(cumul / total) * 360, ((cumul + p.poids) / total) * 360]); cumul += p.poids; }

  useEffect(() => {
    if (gagnant === null || lancement === 0) return;
    const [a0, a1] = angles[gagnant];
    // le gagnant s'arrête n'importe où dans sa part (pas toujours au milieu)
    const decalage = (Math.random() - 0.5) * (a1 - a0) * 0.7;
    const finale = ((360 - ((a0 + a1) / 2 + decalage)) % 360 + 360) % 360;
    const base = courant.current - (courant.current % 360);
    const cible = base + 360 * TOURS + finale;
    if (!animer) { rotation.setValue(cible); courant.current = cible; onFin(); return; }
    courant.current = cible;
    Animated.timing(rotation, { toValue: cible, duration: DUREE_ROUE, easing: Easing.bezier(0.15, 0.6, 0.15, 1), useNativeDriver: true }).start(({ finished }) => { if (finished) onFin(); });
  }, [lancement]); // eslint-disable-line react-hooks/exhaustive-deps

  const taillePolice = Math.max(9, Math.min(15, 240 / parts.length));
  return (
    <View style={{ width: taille, height: taille + 16, alignItems: "center" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={{ width: taille, height: taille, marginTop: 16, transform: [{ rotate: rotation.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] }) }] }}>
        <Svg width={taille} height={taille}>
          {parts.map((p, i) => {
            const [a0, a1] = angles[i];
            const [x0, y0] = polaire(cx, cy, rayon, a0), [x1, y1] = polaire(cx, cy, rayon, a1);
            const grand = a1 - a0 > 180 ? 1 : 0;
            const milieu = (a0 + a1) / 2;
            const d = parts.length === 1 ? `M ${cx} ${cy - rayon} A ${rayon} ${rayon} 0 1 1 ${cx - 0.01} ${cy - rayon} Z` : `M ${cx} ${cy} L ${x0} ${y0} A ${rayon} ${rayon} 0 ${grand} 1 ${x1} ${y1} Z`;
            const etiquette = p.nom.length > 13 ? p.nom.slice(0, 12) + "…" : p.nom;
            const ty = cy - rayon * 0.58;
            return (
              <G key={i}>
                <Path d={d} fill={FILL[i % 2]} stroke={couleurs.encre} strokeWidth={1.5} />
                <G rotation={milieu} origin={`${cx}, ${cy}`}>
                  <SvgText x={cx} y={ty} fontSize={taillePolice} fontWeight="600" fontFamily="sans-serif" fill={couleurs.encre} textAnchor="middle" rotation={-90} origin={`${cx}, ${ty}`}>{etiquette}</SvgText>
                </G>
              </G>
            );
          })}
          <Path d={`M ${cx} ${cy} m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0`} fill={couleurs.encre} />
        </Svg>
      </Animated.View>
      {/* la flèche, fixe, en haut */}
      <Svg width={28} height={26} style={{ position: "absolute", top: 0 }}>
        <Polygon points="3,2 25,2 14,24" fill={couleurs.encre} />
      </Svg>
    </View>
  );
}
