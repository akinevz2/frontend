import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * The project-file mtimes, read straight from the filesystem.
 *
 * Serves the virtual module `virtual:project-mtimes`: a map from
 * `src/content/projects/<file>.json` file names to the file's mtime
 * (epoch ms). The projects listing (src/content/index.ts) sorts
 * projects without a `lastModified` field first, among themselves by
 * mtime (newest first), ahead of the dated ones. There is NO snapshot
 * to author, commit or refresh — the walk runs when the module is
 * first loaded (dev server start, production build) and the dev
 * watcher recomputes it whenever the projects directory changes.
 */

const VIRTUAL_ID = "virtual:project-mtimes";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

export function listProjectMtimes(dir: string): Record<string, number> {
  const mtimes: Record<string, number> = {};
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // No projects dir at all: no mtime map.
    return mtimes;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    try {
      mtimes[entry.name] = fs.statSync(path.join(dir, entry.name)).mtimeMs;
    } catch {
      // The file vanished mid-walk: leave it out.
    }
  }
  return mtimes;
}

export function projectMtimesPlugin(projectsDir: string): Plugin {
  return {
    name: "project-mtimes",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const mtimes = listProjectMtimes(projectsDir);
      // dev watcher: watch each json file (file paths only — a
      // directory addWatchFile would be resolved as an import and fail)
      for (const f of Object.keys(mtimes)) {
        this.addWatchFile(path.join(projectsDir, f));
      }
      return `export default ${JSON.stringify(mtimes, null, 2)};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(projectsDir + path.sep)) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.reloadModule(mod);
    },
  };
}
