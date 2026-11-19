import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { couleurs } from "../theme";

/* Écran provisoire : les tirages au sort sont le bloc 4 du plan. */
export default function Tirages() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.centre}>
        <Text style={styles.titre}>{t("tirages.titre")}</Text>
        <Text style={styles.texte}>{t("tirages.bientot")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.papier },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  titre: { fontSize: 28, fontWeight: "700", color: couleurs.encre, marginBottom: 8 },
  texte: { fontSize: 16, color: couleurs.encre2 },
});
