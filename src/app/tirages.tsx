import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Bouton } from "../composants/Bouton";
import { Cartes, Defilement, Piece } from "../composants/Formes";
import { Roue } from "../composants/Roue";
import { fluxSysteme } from "../hasard/systeme";
import {
  ecrireListeCourante, ecrireListes, identifiant, lireListeCourante, lireListes, type Liste,
} from "../stockage";
import { executer, lireNoms, verifier, type CodeErreur, type Demande, type Issue } from "../tirages/moteur";
import { couleurs, largeurMax, rayon } from "../theme";

type Mode = "un" | "plusieurs" | "ordre" | "equipes" | "pile";
type Forme = "roue" | "cartes" | "defilement";
const MODES: Mode[] = ["un", "plusieurs", "ordre", "equipes", "pile"];
const FORMES: Forme[] = ["roue", "cartes", "defilement"];
const ROUE_MAX = 40;
const CARTES_MAX = 24;
const POIDS_MAX = 10;
const NIVEAU_MAX = 10;

function Pas({ valeur, min, max, onChange, labelMoins, labelPlus, label }: { valeur: number; min: number; max: number; onChange: (v: number) => void; labelMoins: string; labelPlus: string; label: string }) {
  return (
    <View style={styles.pas} accessibilityLabel={`${label} : ${valeur}`}>
      <Bouton titre="−" label={labelMoins} petit onPress={() => onChange(Math.max(min, valeur - 1))} />
      <Text style={styles.pasValeur}>{valeur}</Text>
      <Bouton titre="+" label={labelPlus} petit onPress={() => onChange(Math.min(max, valeur + 1))} />
    </View>
  );
}

export default function EcranTirages() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const flux = useRef(fluxSysteme()).current;

  const [listes, setListes] = useState<Liste[]>([]);
  const [courante, setCourante] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("un");
  const [forme, setForme] = useState<Forme>("roue");
  const [k, setK] = useState(2);
  const [nEquipes, setNEquipes] = useState(2);
  const [sansRemise, setSansRemise] = useState(false);
  const [nouvelle, setNouvelle] = useState(false);
  const [nomListe, setNomListe] = useState("");
  const [noms, setNoms] = useState("");

  const [issue, setIssue] = useState<Issue | null>(null);
  const [erreur, setErreur] = useState<CodeErreur | null>(null);
  const [cycleRecommence, setCycleRecommence] = useState(false);
  const [lancement, setLancement] = useState(0);
  const [animer, setAnimer] = useState(true);
  const [revele, setRevele] = useState(true);
  const [visibles, setVisibles] = useState(0);
  const [mouvementReduit, setMouvementReduit] = useState(false);

  useEffect(() => {
    void lireListes().then((l) => {
      setListes(l);
      void lireListeCourante().then((id) => setCourante(l.some((x) => x.id === id) ? id : l[0]?.id ?? null));
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(setMouvementReduit);
  }, []);

  const liste = listes.find((l) => l.id === courante) ?? null;
  const gens = liste?.gens ?? [];
  const nomsListe = gens.map((g) => g.nom);

  // trop de noms pour la roue ou les cartes : on passe au défilement, et on le dit
  const tropRoue = forme === "roue" && gens.length > ROUE_MAX;
  const tropCartes = forme === "cartes" && gens.length > CARTES_MAX;
  const formeEffective: Forme = tropRoue || tropCartes ? "defilement" : forme;

  const majListes = (suite: Liste[]) => { setListes(suite); void ecrireListes(suite); };
  const majListe = (f: (l: Liste) => Liste) => majListes(listes.map((l) => (l.id === courante ? f(l) : l)));
  const choisir = (id: string | null) => { setCourante(id); void ecrireListeCourante(id); setIssue(null); setErreur(null); };

  const creerListe = () => {
    const nom = nomListe.trim();
    if (!nom) return;
    const l: Liste = { id: identifiant(), nom, gens: [] };
    majListes([...listes, l]); choisir(l.id); setNomListe(""); setNouvelle(false);
  };
  const supprimerListe = () => {
    const suite = listes.filter((l) => l.id !== courante);
    majListes(suite); choisir(suite[0]?.id ?? null);
  };
  const ajouterNoms = () => {
    const a = lireNoms(noms);
    if (!a.length || !liste) return;
    majListe((l) => ({ ...l, gens: [...l.gens, ...a.map((nom) => ({ id: identifiant(), nom, poids: 1, niveau: 5 }))], restants: undefined }));
    setNoms("");
  };
  const modifierPersonne = (id: string, champ: "poids" | "niveau", v: number) =>
    majListe((l) => ({ ...l, gens: l.gens.map((g) => (g.id === id ? { ...g, [champ]: v } : g)) }));
  const retirerPersonne = (id: string) =>
    majListe((l) => ({ ...l, gens: l.gens.filter((g) => g.id !== id), restants: l.restants?.filter((r) => r !== id) }));

  /* --- tirage --- */
  const demande = (): Demande => {
    switch (mode) {
      case "un": return sansRemise ? { mode, sansRemise: { restants: liste?.restants ?? [] } } : { mode };
      case "plusieurs": return { mode, k: Math.min(k, Math.max(gens.length, 1)) };
      case "equipes": return { mode, n: nEquipes };
      default: return { mode } as Demande;
    }
  };

  const tirer = () => {
    const d = demande();
    const e = verifier(d, gens);
    setErreur(e);
    if (e) return;
    const avant = liste?.restants;
    const res = executer(d, gens, flux);
    setIssue(res);
    setCycleRecommence(res.mode === "un" && !!res.nouveauCycle && avant !== undefined);
    if (res.mode === "un" && res.restants) majListe((l) => ({ ...l, restants: res.restants }));
    const roule = !mouvementReduit;
    setAnimer(roule);
    setLancement((n) => n + 1);
    // la roue, le défilement et la pièce préviennent quand ils ont fini (onFin) ; les cartes
    // et les listes ont leur propre minuterie plus bas
    const immediat = !roule || res.mode === "equipes" || res.mode === "plusieurs" || res.mode === "ordre";
    setRevele(immediat);
    setVisibles(0);
  };

  // les listes (plusieurs, ordre) se dévoilent une ligne après l'autre
  useEffect(() => {
    if (!issue || (issue.mode !== "plusieurs" && issue.mode !== "ordre")) return;
    const total = issue.indices.length;
    if (!animer) { setVisibles(total); return; }
    let n = 0;
    const id = setInterval(() => { n++; setVisibles(n); if (n >= total) clearInterval(id); }, 380);
    return () => clearInterval(id);
  }, [lancement]); // eslint-disable-line react-hooks/exhaustive-deps

  const fin = useCallback(() => setRevele(true), []);
  // les cartes n'ont pas de rappel : on annonce quand la carte est retournée
  useEffect(() => {
    if (!issue || issue.mode !== "un" || formeEffective !== "cartes") return;
    const id = setTimeout(() => setRevele(true), animer ? 450 + 300 + 250 : 0);
    return () => clearTimeout(id);
  }, [lancement]); // eslint-disable-line react-hooks/exhaustive-deps

  const tailleRoue = Math.min(320, width - 32);
  const gagnantUn = issue?.mode === "un" ? issue.index : null;
  const aListe = mode !== "pile";
  const nbRestants = liste?.restants ? liste.restants.filter((id) => gens.some((g) => g.id === id)).length : gens.length;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.titre}>{t("tirages.titre")}</Text>

        {/* mode */}
        <View style={styles.touches}>
          {MODES.map((m) => <Bouton key={m} titre={t(`tirages.modes.${m}`)} petit actif={m === mode} onPress={() => { setMode(m); setIssue(null); setErreur(null); }} />)}
        </View>

        {/* listes */}
        {aListe && (
          <>
            <Text style={[styles.libelle, styles.section]}>{t("tirages.listes")}</Text>
            <View style={styles.touches}>
              {listes.map((l) => <Bouton key={l.id} titre={l.nom} petit actif={l.id === courante} onPress={() => choisir(l.id)} />)}
              <Bouton titre="+" label={t("tirages.nouvelleListe")} petit onPress={() => setNouvelle((v) => !v)} />
            </View>
            {nouvelle && (
              <View style={styles.ligne}>
                <TextInput style={styles.champ} value={nomListe} onChangeText={setNomListe} placeholder={t("tirages.nomListe")} placeholderTextColor={couleurs.filet}
                  accessibilityLabel={t("tirages.nomListe")} onSubmitEditing={creerListe} />
                <Bouton titre={t("tirages.creer")} onPress={creerListe} />
              </View>
            )}
            {!liste && !nouvelle && <Text style={styles.discret}>{t("tirages.aucuneListe")}</Text>}

            {liste && (
              <View style={styles.carte}>
                {gens.map((g) => (
                  <View key={g.id} style={styles.personne}>
                    <Text style={[styles.texte, { flex: 1 }]} numberOfLines={1}>{g.nom}</Text>
                    {(mode === "un" || mode === "plusieurs") && !(mode === "un" && sansRemise) && (
                      <Pas valeur={g.poids} min={1} max={POIDS_MAX} onChange={(v) => modifierPersonne(g.id, "poids", v)}
                        labelMoins={`${t("tirages.moins")} ${t("tirages.poidsDe", { nom: g.nom })}`} labelPlus={`${t("tirages.plus")} ${t("tirages.poidsDe", { nom: g.nom })}`} label={t("tirages.poidsDe", { nom: g.nom })} />
                    )}
                    {mode === "equipes" && (
                      <Pas valeur={g.niveau} min={1} max={NIVEAU_MAX} onChange={(v) => modifierPersonne(g.id, "niveau", v)}
                        labelMoins={`${t("tirages.moins")} ${t("tirages.niveauDe", { nom: g.nom })}`} labelPlus={`${t("tirages.plus")} ${t("tirages.niveauDe", { nom: g.nom })}`} label={t("tirages.niveauDe", { nom: g.nom })} />
                    )}
                    <Bouton titre="×" label={t("tirages.retirer", { nom: g.nom })} petit onPress={() => retirerPersonne(g.id)} />
                  </View>
                ))}
                {(mode === "un" || mode === "plusieurs") && gens.length > 0 && <Text style={styles.discret}>{sansRemise && mode === "un" ? t("tirages.poidsIgnores") : t("tirages.aidePoids")}</Text>}
                {mode === "equipes" && gens.length > 0 && <Text style={styles.discret}>{t("tirages.aideNiveau")}</Text>}
                <TextInput style={[styles.champ, styles.champNoms]} value={noms} onChangeText={setNoms} multiline placeholder={t("tirages.ajouterNoms")}
                  placeholderTextColor={couleurs.filet} accessibilityLabel={t("tirages.ajouterNoms")} />
                <View style={styles.ligne}>
                  <Bouton titre={t("tirages.ajouter")} onPress={ajouterNoms} />
                  <View style={{ flex: 1 }} />
                  <Bouton titre={t("tirages.supprimerListe")} petit onPress={supprimerListe} />
                </View>
              </View>
            )}
          </>
        )}

        {/* réglages du mode */}
        {mode === "un" && (
          <>
            <View style={[styles.touches, styles.section]}>
              {FORMES.map((f) => <Bouton key={f} titre={t(`tirages.formes.${f}`)} petit actif={f === forme} onPress={() => { setForme(f); setIssue(null); }} />)}
              <Bouton titre={t("tirages.sansRemise")} petit actif={sansRemise} onPress={() => setSansRemise((v) => !v)} />
            </View>
            {(tropRoue || tropCartes) && <Text style={styles.discret}>{tropRoue ? t("tirages.tropRoue") : t("tirages.tropCartes")}</Text>}
            {sansRemise && liste && (
              <View style={styles.ligne}>
                <Text style={[styles.discret, { flex: 1 }]}>{t("tirages.restants", { n: nbRestants, total: gens.length })}</Text>
                <Bouton titre={t("tirages.nouveauCycle")} petit onPress={() => majListe((l) => ({ ...l, restants: undefined }))} />
              </View>
            )}
          </>
        )}
        {mode === "plusieurs" && (
          <View style={[styles.ligne, styles.section]}>
            <Text style={[styles.texte, { flex: 1 }]}>{t("tirages.nombre")}</Text>
            <Pas valeur={k} min={1} max={Math.max(1, gens.length || 20)} onChange={setK} labelMoins={t("tirages.moins")} labelPlus={t("tirages.plus")} label={t("tirages.nombre")} />
          </View>
        )}
        {mode === "equipes" && (
          <View style={[styles.ligne, styles.section]}>
            <Text style={[styles.texte, { flex: 1 }]}>{t("tirages.nbEquipes")}</Text>
            <Pas valeur={nEquipes} min={2} max={Math.max(2, Math.min(8, gens.length || 8))} onChange={setNEquipes} labelMoins={t("tirages.moins")} labelPlus={t("tirages.plus")} label={t("tirages.nbEquipes")} />
          </View>
        )}

        <Bouton titre={t("tirages.tirer")} plein onPress={tirer} style={styles.tirer} />
        {erreur && <Text accessibilityRole="alert" style={styles.erreur}>{t(`tirages.erreurs.${erreur}`)}</Text>}

        {/* résultat */}
        {mode === "un" && gens.length > 0 && (
          <View style={styles.resultat}>
            {formeEffective === "roue" && (
              <Roue parts={gens.map((g) => ({ nom: g.nom, poids: sansRemise ? 1 : g.poids }))} gagnant={gagnantUn} lancement={lancement} animer={animer} onFin={fin} taille={tailleRoue} />
            )}
            {formeEffective === "cartes" && <Cartes noms={nomsListe} gagnants={gagnantUn === null ? [] : [gagnantUn]} lancement={lancement} animer={animer} />}
            {formeEffective === "defilement" && <Defilement noms={nomsListe} gagnant={gagnantUn} lancement={lancement} animer={animer} onFin={fin} />}
            {issue?.mode === "un" && (
              <Text style={styles.gagnant} accessibilityLiveRegion="polite" aria-live="polite">{revele ? t("tirages.tire", { nom: gens[issue.index]?.nom ?? "" }) : ""}</Text>
            )}
            {cycleRecommence && revele && <Text style={styles.discret}>{t("tirages.cycleRecommence")}</Text>}
          </View>
        )}

        {issue && (issue.mode === "plusieurs" || issue.mode === "ordre") && (
          <View style={styles.carte}>
            <View accessibilityLiveRegion="polite" aria-live="polite">
              {issue.indices.slice(0, visibles).map((idx, rang) => (
                <View key={rang} style={styles.rang}>
                  <Text style={styles.rangNumero}>{rang + 1}</Text>
                  <Text style={styles.rangNom}>{gens[idx]?.nom}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {issue?.mode === "equipes" && (
          <View style={{ gap: 8, marginTop: 8 }}>
            {issue.partage.equipes.map((eq, i) => (
              <View key={i} style={styles.carte}>
                <View style={styles.ligne}>
                  <Text style={[styles.libelle, { flex: 1, marginBottom: 0 }]}>{t("tirages.equipe", { n: i + 1 })}</Text>
                  <Text style={styles.discret}>{t("tirages.niveauTotal", { n: issue.partage.sommes[i] })}</Text>
                </View>
                {eq.map((idx) => (
                  <View key={idx} style={styles.rang}>
                    <Text style={styles.rangNom}>{gens[idx]?.nom}</Text>
                    <Text style={styles.discret}>{gens[idx]?.niveau}</Text>
                  </View>
                ))}
              </View>
            ))}
            <Text style={styles.discret}>{issue.partage.optimal ? t("tirages.partageOptimal") : t("tirages.partageEcart", { e: issue.partage.ecart })}</Text>
          </View>
        )}

        {mode === "pile" && (
          <View style={styles.resultat}>
            <Piece face={issue?.mode === "pile" ? issue.face : null} lancement={lancement} animer={animer} onFin={fin} pile={t("tirages.pile")} faceTexte={t("tirages.face")} />
            {issue?.mode === "pile" && (
              <Text style={styles.gagnant} accessibilityLiveRegion="polite" aria-live="polite">{revele ? (issue.face === 0 ? t("tirages.pile") : t("tirages.face")) : ""}</Text>
            )}
          </View>
        )}

        <Text style={[styles.discret, styles.section]}>{t("tirages.aide")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: couleurs.papier },
  contenu: { width: "100%", maxWidth: largeurMax, alignSelf: "center", padding: 16, paddingBottom: 40 },
  titre: { fontSize: 30, fontWeight: "700", color: couleurs.encre, marginBottom: 12 },
  libelle: { fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: couleurs.encre2, marginBottom: 6 },
  section: { marginTop: 20 },
  ligne: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  touches: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  champ: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: couleurs.encre2, borderRadius: rayon, paddingHorizontal: 12, backgroundColor: couleurs.carte, fontSize: 16, color: couleurs.encre },
  champNoms: { flex: 0, minHeight: 64, paddingTop: 10, textAlignVertical: "top" },
  carte: { backgroundColor: couleurs.carte, borderRadius: rayon, borderWidth: 1, borderColor: couleurs.filet, padding: 12, marginTop: 8, gap: 6 },
  personne: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 },
  pas: { flexDirection: "row", alignItems: "center", gap: 4 },
  pasValeur: { minWidth: 24, textAlign: "center", fontSize: 16, fontWeight: "700", color: couleurs.encre },
  texte: { fontSize: 15, color: couleurs.encre },
  discret: { fontSize: 13, color: couleurs.encre2 },
  tirer: { marginTop: 8, minHeight: 52 },
  erreur: { color: couleurs.erreur, fontSize: 14, marginTop: 8 },
  resultat: { alignItems: "center", marginTop: 16, gap: 12 },
  gagnant: { fontSize: 26, fontWeight: "800", color: couleurs.encre, textAlign: "center", minHeight: 34 },
  rang: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40 },
  rangNumero: { width: 28, fontSize: 18, fontWeight: "800", color: couleurs.encre2, fontVariant: ["tabular-nums"] },
  rangNom: { flex: 1, fontSize: 20, fontWeight: "700", color: couleurs.encre },
});
