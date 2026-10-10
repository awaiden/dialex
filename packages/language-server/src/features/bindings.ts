/** Variable name -> dictionary name, for `const s = useDictionary("showcase")`. */
export type Bindings = ReadonlyMap<string, string>;

/**
 * `const s = useDictionary("showcase")`, `const home = await getDictionary("home", locale)`,
 * `let t: Home = injectDictionary<Home>("home")`: a variable that holds a dictionary.
 */
const DECLARATION =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(?:await\s+)?(?:[A-Za-z_$][\w$]*\.)*(?:getDictionary|useDictionary|injectDictionary)\s*(?:<[^()]*?>)?\(\s*(["'`])([^"'`$\n]+)\2/g;

/**
 * Finds the variables in a file that hold a dictionary, so `s.nav.features` can be resolved to
 * `showcase.nav.features`. It is a text match: a variable that is reassigned or shadowed in another
 * scope may resolve to the wrong dictionary, which only affects editor hints.
 */
export function findBindings(text: string): Bindings {
  const bindings = new Map<string, string>();
  for (const match of text.matchAll(DECLARATION)) {
    bindings.set(match[1], match[3]);
  }
  return bindings;
}
