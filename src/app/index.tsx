import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Bouton } from "../composants/Bouton";
import { Courbe } from "../composants/Courbe";
import { DECALAGE, DUREE_BASE, DUREE_MAX, Tuile } from "../composants/Tuile";
import { auMoins, auPlus, ecartType, ErreurNotation, lancer, lire, loi, moyenne, proba, type LoiLancer, type Resultat } from "../hasard";
import { fluxSysteme } from "../hasard/systeme";
import { nombre, pourcent } from "../format";
import { ajouter, ajouterDe, ajouterSigne, nettoyer, retour } from "../notationTexte";
import {
  ecrireFavoris, ecrireHistorique, ecrirePersonnageCourant, ecrirePersonnages, identifiant, lireFavoris, lireHistorique,
  lirePersonnageCourant, lirePersonnages, type Favori, type Lancer, type Personnage,
} from "../stockage";
import { couleurs, largeurMax, rayon } from "../theme";

const DES = [4, 6, 8, 10, 12, 20, 100];
const CHIFFRES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
/** au-delà, les dés se posent sans rouler (sinon 100 tuiles qui défilent) */
const ANIMATION_MAX = 30;

export default function EcranDes() {
  const { t, i18n } = useTranslation();
  const langue = i18n.language;
  const flux = useRef(fluxSysteme()).current;

  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<ErreurNotation | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [distribution, setDistribution] = useState<LoiLancer | null>(null);
  const [lancement, setLancement] = useState(0);
  const [animer, setAnimer] = useState(false);
  /* le total et la courbe n'apparaissent qu'une fois le dernier dé posé */
  const [revele, setRevele] = useState(true);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mouvementReduit, setMouvementReduit] = useState(false);

  const [historique, setHistorique] = useState<Lancer[]>([]);
  const [personnages, setPersonnages] = useState<Personnage[]>([]);
  const [courant, setCourant] = useState<string | null>(null);
  const [favoris, setFavoris] = useState<Favori[]>([]);
  const [nouveau, setNouveau] = useState(false);
  const [nomPersonnage, setNomPersonnage] = useState("");
  const [nomFavori, setNomFavori] = useState("");

  useEffect(() => {
    void lireHistorique().then(setHistorique);
    void lirePersonnages().then(setPersonnages);
    void lireFavoris().then(setFavoris);
    void lirePersonnageCourant().then(setCourant);
    void AccessibilityInfo.isReduceMotionEnabled().then(setMouvementReduit);
  }, []);

  const lancerNotation = useCallback((brut: string) => {
    const notation = nettoyer(brut);
    setTexte(notation);
    let expression;
    try {
      expression = lire(notation);
    } catch (e) {
      if (e instanceof ErreurNotation) { setErreur(e); return; }
      throw e;
    }
    setErreur(null);
    const res = lancer(expression, flux);
    const nbDes = res.termes.reduce((a, x) => a + (x.type === "des" ? x.des.length : 0), 0);
    setResultat(res);
    setDistribution(null);
    const roule = !mouvementReduit && nbDes <= ANIMATION_MAX;
    setAnimer(roule);
    if (minuterie.current) clearTimeout(minuterie.current);
    setRevele(!roule);
    if (roule) minuterie.current = setTimeout(() => setRevele(true), Math.min(DUREE_BASE + (nbDes - 1) * DECALAGE, DUREE_MAX) + 350);
    setLancement((n) => n + 1);
    // la loi se calcule juste après l'affichage : un lancer énorme ne fige pas l'écran
    setTimeout(() => setDistribution(loi(expression, flux)), 0);
    setHistorique((h) => {
      const suite = [{ id: identifiant(), notation, total: res.total, date: Date.now() }, ...h].slice(0, 100);
      void ecrireHistorique(suite);
      return suite;
    });
  }, [flux, mouvementReduit]);

  const modifier = (f: (x: string) => string) => { setErreur(null); setTexte((x) => f(x)); };

  /* --- favoris --- */
  const favorisDuPersonnage = useMemo(() => favoris.filter((f) => f.personnageId === courant), [favoris, courant]);
  const choisir = (id: string | null) => { setCourant(id); void ecrirePersonnageCourant(id); };
  const ajouterPersonnage = () => {
    const nom = nomPersonnage.trim();
    if (!nom) return;
    const p = { id: identifiant(), nom };
    const suite = [...personnages, p];
    setPersonnages(suite); void ecrirePersonnages(suite);
    choisir(p.id); setNomPersonnage(""); setNouveau(false);
  };
  const supprimerPersonnage = () => {
    if (!courant) return;
    const p = personnages.filter((x) => x.id !== courant), f = favoris.filter((x) => x.personnageId !== courant);
    setPersonnages(p); void ecrirePersonnages(p); setFavoris(f); void ecrireFavoris(f);
    choisir(p[0]?.id ?? null);
  };
  const enregistrerFavori = () => {
    if (!courant || !texte) return;
    try { lire(texte); } catch { return; }
    const f = [...favoris, { id: identifiant(), personnageId: courant, nom: nomFavori.trim() || texte, notation: texte }];
    setFavoris(f); void ecrireFavoris(f); setNomFavori("");
  };
  const supprimerFavori = (id: string) => {
    const f = favoris.filter((x) => x.id !== id);
    setFavoris(f); void ecrireFavoris(f);
  };

  /* --- affichage du résultat --- */
  const totalAnnonce = resultat ? String(resultat.total) : "";
  const message = erreur ? t(`erreurs.${erreur.code}`, { ...erreur.params, position: erreur.position + 1 }) : null;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.titre}>{t("des.titre")}</Text>

        <Text style={styles.libelle}>{t("des.notation")}</Text>
        <View style={styles.ligne}>
          <TextInput
            style={[styles.champ, erreur && styles.champErreur]}
            value={texte}
            onChangeText={(v) => { setErreur(null); setTexte(nettoyer(v)); }}
            onSubmitEditing={() => lancerNotation(texte)}
            placeholder={t("des.placeholder")}
            placeholderTextColor={couleurs.filet}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            accessibilityLabel={t("des.notation")}
            returnKeyType="go"
          />
          <Bouton titre={t("des.lancer")} plein onPress={() => lancerNotation(texte)} />
        </View>
        {message && <Text accessibilityRole="alert" style={styles.erreur}>{message}</Text>}

        {/* clavier de notation */}
        <View style={styles.touches}>
          {DES.map((f) => <Bouton key={f} titre={`d${f}`} style={styles.touche} onPress={() => modifier((x) => ajouterDe(x, f))} />)}
        </View>
        <View style={styles.touches}>
          {CHIFFRES.slice(0, 5).map((c) => <Bouton key={c} titre={c} style={styles.touche} onPress={() => modifier((x) => ajouter(x, c))} />)}
        </View>
        <View style={styles.touches}>
          {CHIFFRES.slice(5).map((c) => <Bouton key={c} titre={c} style={styles.touche} onPress={() => modifier((x) => ajouter(x, c))} />)}
        </View>
        <View style={styles.touches}>
          <Bouton titre="+" style={styles.touche} onPress={() => modifier((x) => ajouterSigne(x, "+"))} />
          <Bouton titre="−" label="moins" style={styles.touche} onPress={() => modifier((x) => ajouterSigne(x, "-"))} />
          <Bouton titre="⌫" label={t("des.retour")} style={styles.touche} onPress={() => modifier(retour)} />
          <Bouton titre="C" label={t("des.effacer")} style={styles.touche} onPress={() => modifier(() => "")} />
        </View>
        <View style={styles.touches}>
          <Bouton titre="kh" label={t("des.garderMeilleurs")} style={styles.touche} onPress={() => modifier((x) => ajouter(x, "kh"))} />
          <Bouton titre="kl" label={t("des.garderPires")} style={styles.touche} onPress={() => modifier((x) => ajouter(x, "kl"))} />
          <Bouton titre="!" label={t("des.explose")} style={styles.touche} onPress={() => modifier((x) => ajouter(x, "!"))} />
          <Bouton titre="r" label={t("des.relancer")} style={styles.touche} onPress={() => modifier((x) => ajouter(x, "r"))} />
        </View>

        {/* résultat */}
        {resultat && (
          <View style={styles.carte}>
            {resultat.termes.map((terme, i) =>
              terme.type === "constante" ? (
                <Text key={i} style={styles.constante}>{terme.signe === 1 ? "+" : "−"}{terme.valeur}</Text>
              ) : (
                <View key={i}>
                  <Text style={styles.groupe}>{terme.groupe.signe === -1 ? "− " : ""}{terme.groupe.texte}</Text>
                  <View style={styles.tuiles}>
                    {terme.des.map((de, k) => (
                      <Tuile key={k} de={de} faces={terme.groupe.faces} rang={k} lancement={lancement} animer={animer} />
                    ))}
                  </View>
                </View>
              ),
            )}
            <View style={styles.totalLigne}>
              <Text style={styles.libelle}>{t("des.total")}</Text>
              <Text style={styles.total} accessibilityLiveRegion="polite" aria-live="polite">{revele ? totalAnnonce : ""}</Text>
            </View>

            {revele && distribution && (
              <View style={styles.proba}>
                <Text style={styles.libelle}>{t("des.probabilite")}</Text>
                <Courbe loi={distribution} resultat={resultat.total} />
                <Text style={styles.texte}>{t("des.exactement", { x: resultat.total, p: pourcent(proba(distribution, resultat.total), langue) })}</Text>
                <Text style={styles.texte}>{t("des.auMoins", { x: resultat.total, p: pourcent(auMoins(distribution, resultat.total), langue) })}</Text>
                <Text style={styles.texte}>{t("des.auPlus", { x: resultat.total, p: pourcent(auPlus(distribution, resultat.total), langue) })}</Text>
                <Text style={styles.discret}>{t("des.moyenne", { m: nombre(moyenne(distribution), langue), e: nombre(ecartType(distribution), langue) })}</Text>
                {!distribution.exacte && <Text style={styles.discret}>{t("des.estimee", { n: distribution.echantillons })}</Text>}
                {distribution.reste > 1e-9 && <Text style={styles.discret}>{t("des.reste", { p: pourcent(distribution.reste, langue) })}</Text>}
              </View>
            )}
          </View>
        )}

        {/* favoris */}
        <Text style={[styles.libelle, styles.section]}>{t("des.favoris")}</Text>
        <View style={styles.touches}>
          {personnages.map((p) => (
            <Bouton key={p.id} titre={p.nom} petit actif={p.id === courant} onPress={() => choisir(p.id)} />
          ))}
          <Bouton titre="+" label={t("des.nouveauPersonnage")} petit onPress={() => setNouveau((v) => !v)} />
        </View>
        {nouveau && (
          <View style={styles.ligne}>
            <TextInput style={styles.champ} value={nomPersonnage} onChangeText={setNomPersonnage} placeholder={t("des.nomPersonnage")}
              placeholderTextColor={couleurs.filet} accessibilityLabel={t("des.nomPersonnage")} onSubmitEditing={ajouterPersonnage} />
            <Bouton titre={t("des.ajouter")} onPress={ajouterPersonnage} />
          </View>
        )}
        {courant && (
          <View style={styles.carte}>
            {favorisDuPersonnage.length === 0 && <Text style={styles.discret}>{t("des.aucunFavori")}</Text>}
            {favorisDuPersonnage.map((f) => (
              <View key={f.id} style={styles.favori}>
                <Pressable accessibilityRole="button" onPress={() => lancerNotation(f.notation)} style={styles.favoriTexte}>
                  <Text style={styles.texte}>{f.nom}</Text>
                  <Text style={styles.discret}>{f.notation}</Text>
                </Pressable>
                <Bouton titre="×" label={`${t("des.supprimer")} ${f.nom}`} petit onPress={() => supprimerFavori(f.id)} />
              </View>
            ))}
            <View style={styles.ligne}>
              <TextInput style={styles.champ} value={nomFavori} onChangeText={setNomFavori} placeholder={t("des.nomFavori")}
                placeholderTextColor={couleurs.filet} accessibilityLabel={t("des.nomFavori")} />
              <Bouton titre="★" label={t("des.enregistrerFavori")} onPress={enregistrerFavori} />
            </View>
            <Bouton titre={t("des.supprimerPersonnage")} petit onPress={supprimerPersonnage} style={styles.alignGauche} />
          </View>
        )}

        {/* historique */}
        <View style={[styles.ligne, styles.section]}>
          <Text style={[styles.libelle, { flex: 1 }]}>{t("des.historique")}</Text>
          {historique.length > 0 && <Bouton titre={t("des.viderHistorique")} petit onPress={() => { setHistorique([]); void ecrireHistorique([]); }} />}
        </View>
        <View style={styles.carte}>
          {historique.length === 0 && <Text style={styles.discret}>{t("des.historiqueVide")}</Text>}
          {historique.slice(0, 12).map((l) => (
            <Pressable key={l.id} accessibilityRole="button" onPress={() => setTexte(l.notation)} style={styles.histo}>
              <Text style={[styles.texte, { flex: 1 }]}>{l.notation}</Text>
              <Text style={styles.histoTotal}>{l.total}</Text>
              <Text style={styles.discret}>{new Date(l.date).toLocaleTimeString(langue, { hour: "2-digit", minute: "2-digit" })}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.discret, styles.section]}>{t("des.aide")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.papier },
  contenu: { width: "100%", maxWidth: largeurMax, alignSelf: "center", padding: 16, paddingBottom: 40 },
  titre: { fontSize: 30, fontWeight: "700", color: couleurs.encre, marginBottom: 12 },
  libelle: { fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: couleurs.encre2, marginBottom: 6 },
  section: { marginTop: 24 },
  ligne: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  champ: {
    flex: 1, minHeight: 44, borderWidth: 1, borderColor: couleurs.encre2, borderRadius: rayon, paddingHorizontal: 12,
    backgroundColor: couleurs.carte, fontSize: 20, color: couleurs.encre,
  },
  champErreur: { borderColor: couleurs.erreur },
  erreur: { color: couleurs.erreur, fontSize: 14, marginBottom: 8 },
  touches: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  touche: { flex: 1, minWidth: 0 },
  carte: { backgroundColor: couleurs.carte, borderRadius: rayon, borderWidth: 1, borderColor: couleurs.filet, padding: 12, marginTop: 8, gap: 6 },
  tuiles: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  groupe: { fontSize: 14, fontWeight: "700", color: couleurs.encre2, marginBottom: 6 },
  constante: { fontSize: 22, fontWeight: "700", color: couleurs.encre },
  totalLigne: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: couleurs.filet, paddingTop: 8 },
  total: { fontSize: 44, fontWeight: "800", color: couleurs.encre, fontVariant: ["tabular-nums"] },
  proba: { borderTopWidth: 1, borderTopColor: couleurs.filet, paddingTop: 10, gap: 4 },
  texte: { fontSize: 15, color: couleurs.encre },
  discret: { fontSize: 13, color: couleurs.encre2 },
  favori: { flexDirection: "row", alignItems: "center", gap: 8 },
  favoriTexte: { flex: 1, minHeight: 44, justifyContent: "center" },
  alignGauche: { alignSelf: "flex-start" },
  histo: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40 },
  histoTotal: { fontSize: 18, fontWeight: "700", color: couleurs.encre, minWidth: 40, textAlign: "right" },
});
