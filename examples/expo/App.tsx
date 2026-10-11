import AsyncStorage from "@react-native-async-storage/async-storage";
import { DialexProvider } from "dialexjs/react-native";
import { getLocales } from "expo-localization";
import { StatusBar } from "expo-status-bar";

import { dialex } from "./src/dialex.generated";
import { Home } from "./src/Home";

export default function App() {
  return (
    // deviceLocales picks the first language of the device that the app supports; storage
    // remembers the user's choice and applies it on the next launch.
    <DialexProvider
      {...dialex}
      deviceLocales={getLocales().map((locale) => locale.languageTag)}
      storage={AsyncStorage}
    >
      <Home />
      <StatusBar style="auto" />
    </DialexProvider>
  );
}
