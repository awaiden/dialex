import { useDictionary, useT } from "dialexjs/react-native";
import { useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";

import { LanguageSwitcher } from "./components/LanguageSwitcher";

export function Home() {
  const common = useDictionary("common");
  const home = useDictionary("home");
  const t = useT("home");
  const [count, setCount] = useState(2);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.strong}>{common.appName}</Text>
        <LanguageSwitcher />
      </View>

      <Text style={styles.title}>{home.title}</Text>
      <Text style={styles.muted}>{home.subtitle}</Text>
      <Text>{home.greeting("Alex")}</Text>

      <View style={styles.section}>
        <Text style={styles.heading}>{home.cart.title}</Text>
        <Text>{t("home.cart.items", { count })}</Text>
        <View style={styles.row}>
          <Button title={common.actions.add} onPress={() => setCount((n) => n + 1)} />
          <Button title={common.actions.reset} onPress={() => setCount(0)} />
        </View>
      </View>

      <Text>{t("home.role", { role: "admin" })}</Text>
      <Text style={styles.footer}>{common.footer}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 64, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  strong: { fontWeight: "700" },
  title: { fontSize: 28, fontWeight: "700" },
  heading: { fontSize: 20, fontWeight: "600" },
  muted: { opacity: 0.7 },
  section: { borderWidth: 1, borderColor: "#8884", borderRadius: 8, padding: 16, gap: 8 },
  row: { flexDirection: "row", gap: 8 },
  footer: { textAlign: "center", opacity: 0.6, marginTop: 24 },
});
