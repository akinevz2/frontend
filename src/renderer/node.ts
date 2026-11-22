/** `src/renderer/node.ts` — the node-only entrypoint (fs walks from
 * `sources/collect.ts`). Imported by `build/*` shims and node tests
 * only; never part of the browser bundle (the boundary test on the
 * import closure of src/main.tsx enforces that). */

export {
  collectSources,
  collectTreeSources,
  collectBlogSources,
  listTreeDirs,
  listBlogDirs,
  makeFsReader,
  collectTreeEnv,
  collectBlogEnv,
  blogPathDate,
  type BlogDirEntry,
  type BlogSourceFile,
} from "./sources/collect.ts";
