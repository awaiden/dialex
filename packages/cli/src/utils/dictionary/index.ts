/**
 * AST-level helpers for reading and editing `.content.ts` dictionary files.
 *
 * Magicast's proxy layer cannot represent every value (for example template-literal
 * functions), so these helpers work on the underlying AST nodes and use Magicast only
 * to parse and print, which preserves the rest of the file's formatting.
 *
 * Supported shapes:
 * - `export default defineDictionary("name", { en: {...}, tr: {...} })`
 * - `export default defineDictionary({ name: "name", dictionary: { ... } })`
 * - `export default { name: "name", dictionary: { ... } }`
 */

export { TODO_PREFIX } from "./types.js";
export type { DictionaryFile, Leaf, LeafKind, SourceRange } from "./types.js";
export {
  loadDictionaryFile,
  parseDictionaryText,
  renderDictionaryFile,
  saveDictionaryFile,
} from "./io.js";
export { flattenPaths, getString, hasPath, listLeaves, listLocales } from "./read.js";
export { copyLeaf, setString, type SetResult } from "./write.js";
export { dictionaryLocation, getLeafSource, locationOf } from "./locations.js";
