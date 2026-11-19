import "../i18n";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { couleurs } from "../theme";

export default function Disposition() {
  const { t } = useTranslation();
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: couleurs.encre,
          tabBarInactiveTintColor: couleurs.encre2,
          tabBarStyle: { backgroundColor: couleurs.carte, borderTopColor: couleurs.filet },
          tabBarLabelStyle: { fontSize: 14, fontWeight: "600" },
          tabBarIcon: () => null,
          tabBarIconStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t("onglets.des") }} />
        <Tabs.Screen name="tirages" options={{ title: t("onglets.tirages") }} />
      </Tabs>
    </>
  );
}
