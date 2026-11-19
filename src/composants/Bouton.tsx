import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { couleurs, rayon } from "../theme";

interface Props {
  titre: string;
  onPress: () => void;
  /** texte lu par les lecteurs d'écran, si différent du titre */
  label?: string;
  plein?: boolean;
  petit?: boolean;
  actif?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Bouton({ titre, onPress, label, plein, petit, actif, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? titre}
      accessibilityState={{ selected: actif }}
      onPress={onPress}
      style={({ pressed }) => [styles.base, petit && styles.petit, plein && styles.plein, actif && styles.actif, pressed && styles.appuye, style]}
    >
      <Text style={[styles.texte, petit && styles.texteSmall, (plein || actif) && styles.textePlein]}>{titre}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minWidth: 44, minHeight: 44, paddingHorizontal: 12, borderRadius: rayon, borderWidth: 1, borderColor: couleurs.encre2, backgroundColor: couleurs.carte, alignItems: "center", justifyContent: "center" },
  petit: { minHeight: 36, minWidth: 36, paddingHorizontal: 10 },
  plein: { backgroundColor: couleurs.accent, borderColor: couleurs.accent },
  actif: { backgroundColor: couleurs.accent, borderColor: couleurs.accent },
  appuye: { opacity: 0.6 },
  texte: { fontSize: 16, fontWeight: "600", color: couleurs.encre },
  texteSmall: { fontSize: 14 },
  textePlein: { color: couleurs.surAccent },
});
