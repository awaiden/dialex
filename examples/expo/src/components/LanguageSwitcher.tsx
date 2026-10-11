import { useDialex } from "dialexjs/react-native";
import { Button, StyleSheet, View } from "react-native";

import { locales } from "../dialex.generated";

export function LanguageSwitcher() {
  const { locale, setLocale } = useDialex();

  return (
    <View style={styles.row}>
      {locales.map((code) => (
        <Button
          key={code}
          title={code.toUpperCase()}
          disabled={code === locale}
          onPress={() => setLocale(code)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4 },
});
