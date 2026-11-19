import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { couleurs } from "../theme";
import type { De } from "../hasard";

/* Un dé : une tuile qui « roule » (des chiffres défilent) puis se pose sur son résultat.
   Le résultat est déjà tiré : l'animation n'en décide rien, elle ne fait que l'habiller. */

interface Props {
  de: De;
  faces: number;
  /** numéro d'ordre, pour décaler la fin du roulement d'un dé à l'autre */
  rang: number;
  /** vrai quand un nouveau lancer vient de partir (change à chaque lancer) */
  lancement: number;
  animer: boolean;
}

export const DUREE_BASE = 520;
export const DECALAGE = 70;
export const DUREE_MAX = 1500;

export function Tuile({ de, faces, rang, lancement, animer }: Props) {
  const { t } = useTranslation();
  const [affiche, setAffiche] = useState(de.valeur);
  const echelle = useRef(new Animated.Value(1)).current;
  const penche = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animer) { setAffiche(de.valeur); return; }
    const duree = Math.min(DUREE_BASE + rang * DECALAGE, DUREE_MAX);
    const max = Math.max(faces, 2);
    const id = setInterval(() => setAffiche(1 + Math.floor(Math.random() * max)), 65);
    const fin = setTimeout(() => {
      clearInterval(id);
      setAffiche(de.valeur);
      echelle.setValue(1.18);
      Animated.spring(echelle, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
    }, duree);
    penche.setValue(0);
    Animated.timing(penche, { toValue: 1, duration: duree, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    return () => { clearInterval(id); clearTimeout(fin); };
  }, [lancement]); // eslint-disable-line react-hooks/exhaustive-deps

  const rotation = penche.interpolate({ inputRange: [0, 1], outputRange: [`${(rang % 2 ? -1 : 1) * 540}deg`, "0deg"] });
  const grand = String(affiche).length > 2;
  return (
    <Animated.View
      accessible
      accessibilityLabel={`d${faces} : ${de.valeur}${de.garde ? "" : ` (${t("des.ecarte")})`}`}
      style={[styles.tuile, !de.garde && styles.ecarte, { transform: [{ scale: echelle }, { rotate: rotation }] }]}
    >
      <Text style={styles.petit}>d{faces}</Text>
      <Text style={[styles.valeur, grand && styles.valeurGrande, !de.garde && styles.barre]}>{affiche}</Text>
      {de.chaine.length > 1 && <View style={styles.chaine}><Text style={styles.chaineTexte}>{de.chaine.join("+")}</Text></View>}
      {de.relance !== undefined && <Text style={styles.relance}>{de.relance}→</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tuile: {
    width: 64, height: 64, borderRadius: 12, borderWidth: 1.5, borderColor: couleurs.encre, backgroundColor: couleurs.carte,
    alignItems: "center", justifyContent: "center", margin: 4,
  },
  ecarte: { opacity: 0.4, borderStyle: "dashed" },
  petit: { position: "absolute", top: 3, left: 6, fontSize: 10, color: couleurs.encre2 },
  valeur: { fontSize: 28, fontWeight: "700", color: couleurs.encre, fontVariant: ["tabular-nums"] },
  valeurGrande: { fontSize: 20 },
  barre: { textDecorationLine: "line-through" },
  chaine: { position: "absolute", bottom: 2, left: 0, right: 0, alignItems: "center" },
  chaineTexte: { fontSize: 9, color: couleurs.encre2 },
  relance: { position: "absolute", top: 3, right: 6, fontSize: 10, color: couleurs.erreur },
});
