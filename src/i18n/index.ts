import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import fr from "./fr";
import en from "./en";

/* français et anglais ; la langue du téléphone décide, le français sert de repli */
const langue = getLocales()[0]?.languageCode === "en" ? "en" : "fr";

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: langue,
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export default i18n;
