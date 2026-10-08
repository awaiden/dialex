// Stand-in for the `virtual:dialex-dictionaries` module that the bundler plugins provide.
// Tests replace it with `vi.mock`.
export default {} as Record<string, Record<string, any>>;
export const lazy = false;
export function loadDictionary(): Promise<undefined> {
  return Promise.resolve(undefined);
}
