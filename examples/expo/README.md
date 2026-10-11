# Dialex + Expo

An Expo (React Native) app with [Dialex](https://github.com/awaiden/dialex): typed dictionaries, ICU
plurals and locale switching through `dialexjs/react-native`.

```bash
bun run dev      # generates src/dialex.generated.ts, then starts Expo
bun run build    # generates and type-checks
```

- `dialex.config.ts` sets the locales; `src/*.content.ts` hold the dictionaries.
- `App.tsx` wraps the app in `DialexProvider`. `deviceLocales` (from `expo-localization`) picks the
  first language of the device that the app supports, and `storage` (AsyncStorage) remembers the
  user's choice.
- `useDictionary("home")` and `useT("home")` are the hooks of `dialexjs/react`.
- `src/components/LanguageSwitcher.tsx` changes the locale with `setLocale`.
