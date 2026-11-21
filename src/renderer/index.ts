/** `src/renderer` — the browser-safe entrypoint. The ONLY import target
 * from outside the package for app code (the node entrypoint is
 * `src/renderer/node.ts`). See README.md for the boundary rules; the
 * boundary test fails on any deeper import. */

export { validateIncludePath } from "./includes/paths";
export { mdSection, stemOf, humanize } from "./includes/mdSection";
export {
  directivePaths,
  parseTarget,
  discoverTargets,
  targetFromMap,
  makeResolver,
  expandSection,
  resolveSections,
  type IncludeEntry,
} from "./includes/resolve";
export {
  META_DESCRIPTION_MAX,
  truncateDescription,
  PERSON_SAME_AS,
  personJsonLd,
  softwareJsonLd,
} from "./meta/seo";
