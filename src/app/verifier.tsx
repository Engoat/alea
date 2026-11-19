import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Presse from "expo-clipboard";
import { Bouton } from "../composants/Bouton";
import { controler, type Controle, type Enonce } from "../tirages/preuve";
import type { Issue } from "../tirages/moteur";
import { couleurs, largeurMax, rayon } from "../theme";

/* Vérifier un tirage reçu : on colle la preuve, l'appli refait le calcul toute seule. */

export default function EcranVerifier() {
  const { t } = useTranslation();
  const [texte, setTexte] = useState("");
  const [resultat, setResultat] = useState<Controle | null>(null);

  /** le résultat recalculé, en clair */
  const decrire = (i: Issue, e: Enonce): string[] => {
    const nom = (k: number) => e.gens[k]?.nom ?? "?";
    switch (i.mode) {
      case "un": return [t("tirages.tire", { nom: nom(i.index) })];
      case "plusieurs":
      case "ordre": return i.indices.map((k, r) => `${r + 1}. ${nom(k)}`);
      case "equipes": return i.partage.equipes.map((eq, r) => `${t("tirages.equipe", { n: r + 1 })} : ${eq.map(nom).join(", ")}`);
      case "pile": return [i.face === 0 ? t("tirages.pile") : t("tirages.face")];
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.titre}>{t("verifier.titre")}</Text>
        <Text style={styles.discret}>{t("verifier.aide")}</Text>

        <TextInput style={styles.champ} value={texte} onChangeText={(v) => { setTexte(v); setResultat(null); }} multiline autoCapitalize="none" autoCorrect={false}
          placeholder={t("verifier.placeholder")} placeholderTextColor={couleurs.filet} accessibilityLabel={t("verifier.placeholder")} />
        <View style={styles.ligne}>
          <Bouton titre={t("verifier.coller")} petit onPress={() => void Presse.getStringAsync().then((v) => { setTexte(v); setResultat(null); })} />
          <Bouton titre={t("verifier.controler")} plein onPress={() => setResultat(controler(texte))} />
        </View>

        {resultat && !resultat.ok && <Text accessibilityRole="alert" style={styles.erreur}>{t("verifier.illisible")}</Text>}
        {resultat?.ok && (
          <View style={styles.carte} accessibilityLiveRegion="polite" aria-live="polite">
            <Text style={resultat.engagementOk ? styles.ok : styles.erreur}>{resultat.engagementOk ? "✓ " : "✗ "}{t(resultat.engagementOk ? "verifier.empreinteOk" : "verifier.empreinteKo")}</Text>
            <Text style={resultat.resultatOk ? styles.ok : styles.erreur}>{resultat.resultatOk ? "✓ " : "✗ "}{t(resultat.resultatOk ? "verifier.resultatOk" : "verifier.resultatKo")}</Text>
            <Text style={styles.libelle}>{t("verifier.recalcule")}</Text>
            {decrire(resultat.recalcule, resultat.enonce).map((l, i) => <Text key={i} style={styles.texte}>{l}</Text>)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.papier },
  contenu: { width: "100%", maxWidth: largeurMax, alignSelf: "center", padding: 16, paddingBottom: 40, gap: 10 },
  titre: { fontSize: 30, fontWeight: "700", color: couleurs.encre },
  libelle: { fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: couleurs.encre2, marginTop: 6 },
  ligne: { flexDirection: "row", alignItems: "center", gap: 8 },
  champ: { minHeight: 140, borderWidth: 1, borderColor: couleurs.encre2, borderRadius: rayon, padding: 12, backgroundColor: couleurs.carte, fontSize: 14, color: couleurs.encre, textAlignVertical: "top" },
  carte: { backgroundColor: couleurs.carte, borderRadius: rayon, borderWidth: 1, borderColor: couleurs.filet, padding: 12, gap: 6 },
  texte: { fontSize: 16, color: couleurs.encre },
  discret: { fontSize: 13, color: couleurs.encre2 },
  ok: { fontSize: 15, fontWeight: "700", color: couleurs.encre },
  erreur: { fontSize: 15, fontWeight: "700", color: couleurs.erreur },
});
