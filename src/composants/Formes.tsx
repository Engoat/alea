import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { couleurs, rayon } from "../theme";

/* Les autres formes d'un tirage : cartes retournées, noms qui défilent, pièce qui tourne.
   Comme la roue, elles habillent un résultat déjà tiré. */

/* --- cartes ---------------------------------------------------------------- */

function Carte({ nom, retournee, delai, lancement, grise }: { nom: string; retournee: boolean; delai: number; lancement: number; grise: boolean }) {
  const [face, setFace] = useState(false);
  const echelle = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    setFace(false);
    echelle.setValue(1);
    if (!retournee) return;
    const id = setTimeout(() => {
      Animated.timing(echelle, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setFace(true);
        Animated.timing(echelle, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      });
    }, delai);
    return () => clearTimeout(id);
  }, [lancement]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[styles.carte, face ? styles.carteFace : styles.carteDos, grise && !face && styles.carteGrise, { transform: [{ scaleX: echelle }] }]}>
      <Text style={[styles.carteTexte, !face && styles.carteDosTexte]} numberOfLines={2}>{face ? nom : "?"}</Text>
    </Animated.View>
  );
}

export function Cartes({ noms, gagnants, lancement, animer }: { noms: string[]; gagnants: number[]; lancement: number; animer: boolean }) {
  return (
    <View style={styles.cartes}>
      {noms.map((n, i) => (
        <Carte key={i} nom={n} retournee={gagnants.includes(i)} delai={animer ? 450 + gagnants.indexOf(i) * 350 : 0} lancement={lancement} grise={false} />
      ))}
    </View>
  );
}

/* --- défilement ------------------------------------------------------------ */

export function Defilement({ noms, gagnant, lancement, animer, onFin }: { noms: string[]; gagnant: number | null; lancement: number; animer: boolean; onFin: () => void }) {
  const [affiche, setAffiche] = useState<string>("");
  useEffect(() => {
    if (gagnant === null || lancement === 0) { setAffiche(""); return; }
    if (!animer || noms.length === 1) { setAffiche(noms[gagnant]); onFin(); return; }
    let pas = 0, id: ReturnType<typeof setTimeout>;
    const total = 26;
    const suite = () => {
      pas++;
      if (pas >= total) { setAffiche(noms[gagnant]); onFin(); return; }
      // les noms intermédiaires sont de simple décor
      setAffiche(noms[Math.floor(Math.random() * noms.length)]);
      id = setTimeout(suite, 45 + (pas / total) ** 2.2 * 330);
    };
    suite();
    return () => clearTimeout(id);
  }, [lancement]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={styles.defile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.defileTexte} numberOfLines={1}>{affiche}</Text>
    </View>
  );
}

/* --- pièce ----------------------------------------------------------------- */

export function Piece({ face, lancement, animer, onFin, pile, faceTexte }: { face: 0 | 1 | null; lancement: number; animer: boolean; onFin: () => void; pile: string; faceTexte: string }) {
  const rot = useRef(new Animated.Value(0)).current;
  const courant = useRef(0);
  // une seule face est dessinée à la fois : celle qui regarde vers nous (cos de l'angle > 0).
  // Masquer le dos d'une face (backfaceVisibility) ne marche pas partout, celle-ci si.
  const [avant, setAvant] = useState(true);
  useEffect(() => {
    const id = rot.addListener(({ value }) => setAvant(Math.cos((value * Math.PI) / 180) >= 0));
    return () => rot.removeListener(id);
  }, [rot]);
  useEffect(() => {
    if (face === null || lancement === 0) return;
    const base = courant.current - (courant.current % 360);
    const cible = base + 360 * 6 + (face === 1 ? 180 : 0);
    courant.current = cible;
    if (!animer) { rot.setValue(cible); onFin(); return; }
    Animated.timing(rot, { toValue: cible, duration: 1700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) onFin(); });
  }, [lancement]); // eslint-disable-line react-hooks/exhaustive-deps
  const tourne = rot.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });
  return (
    <View style={styles.pieceZone} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.piece, { transform: [{ perspective: 700 }, { rotateX: tourne }] }]}>
        <View style={[styles.pieceFace, avant ? styles.pieceAvant : styles.pieceArriere]}>
          <Text style={[styles.pieceTexte, !avant && { color: couleurs.surAccent }]}>{avant ? pile : faceTexte}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartes: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  carte: { width: 88, height: 64, borderRadius: rayon, borderWidth: 1.5, borderColor: couleurs.encre, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  carteDos: { backgroundColor: couleurs.encre },
  carteFace: { backgroundColor: couleurs.carte },
  carteGrise: { opacity: 0.9 },
  carteTexte: { fontSize: 15, fontWeight: "700", color: couleurs.encre, textAlign: "center" },
  carteDosTexte: { color: couleurs.surAccent, fontSize: 22 },
  defile: { minHeight: 84, borderRadius: rayon, borderWidth: 1.5, borderColor: couleurs.encre, backgroundColor: couleurs.carte, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  defileTexte: { fontSize: 34, fontWeight: "800", color: couleurs.encre },
  pieceZone: { alignItems: "center", paddingVertical: 12 },
  piece: { width: 120, height: 120 },
  pieceFace: { position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: couleurs.encre, alignItems: "center", justifyContent: "center" },
  pieceAvant: { backgroundColor: couleurs.carte },
  // vu de dos, le disque est retourné par la rotation du parent : on le remet à l'endroit
  pieceArriere: { backgroundColor: couleurs.encre, transform: [{ rotateX: "180deg" }] },
  pieceTexte: { fontSize: 24, fontWeight: "800", color: couleurs.encre },
});
