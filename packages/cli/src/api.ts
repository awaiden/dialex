/**
 * Programmatic API of `@dialexjs/cli`, used by the editor extension and other tooling.
 *
 * Everything here reads dictionaries and configs from the syntax tree and never executes project
 * code, except `analyzeProject({ runtime: true })` and `loadProject`, which are opt-in.
 */
export {
  analyzeProject,
  scanReferences,
  relativeFile,
  DEFAULT_SOURCE_GLOB,
  type AnalysisConfig,
  type AnalysisIssue,
  type AnalysisOptions,
  type AnalysisResult,
  type AnalyzedDictionary,
  type IssueCode,
  type IssueLevel,
  type LeafInfo,
  type Reference,
} from "./analysis.js";

export {
  TODO_PREFIX,
  copyLeaf,
  dictionaryLocation,
  getLeafSource,
  getString,
  hasPath,
  listLeaves,
  listLocales,
  locationOf,
  parseDictionaryText,
  renderDictionaryFile,
  setString,
  type DictionaryFile,
  type Leaf,
  type LeafKind,
  type SourceRange,
} from "./utils/dictionary-edit.js";

export {
  DEFAULT_STATIC_CONFIG,
  parseStaticConfig,
  readStaticConfig,
  type StaticConfig,
  type StaticConfigResult,
} from "./utils/static-config.js";

export {
  loadProject,
  loadStaticProject,
  toKey,
  type Project,
  type ProjectDictionary,
} from "./utils/project.js";
