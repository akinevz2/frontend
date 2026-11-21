import fs from "node:fs";
import path from "node:path";
import { PUBLIC } from "./env.ts";
import { listBlogDirs } from "./blogDirsPlugin.ts";
import { listIncludes } from "./includesPlugin.ts";

/**
 * The filesystem side of the blog snapshot pages: a recursive walk of
 * public/blog/ (the same tree build/blogDirsPlugin lists for the app)
 * whose .md/.json files become POST sources, plus the include targets
 * (listIncludes — the same walk src/content uses to expand include
 * directives inside .json posts). Everything is plain fs reads; no
 * network, no installs.
 */
export type BlogSourceFile = { publicPath: string; text: string };

export function collectBlogSources(
  dir: string = path.join(PUBLIC, "blog"),
  rel = "",
): BlogSourceFile[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // No public/blog at all: no posts.
    return [];
  }
  const sources: BlogSourceFile[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      sources.push(
        ...collectBlogSources(
          path.join(dir, entry.name),
          `${rel}/${entry.name}`,
        ),
      );
      continue;
    }
    if (!/\.(md|json)$/i.test(entry.name)) continue;
    try {
      sources.push({
        publicPath: `/blog${rel}/${entry.name}`,
        text: fs.readFileSync(path.join(dir, entry.name), "utf8"),
      });
    } catch {
      // The file vanished mid-walk: leave it out.
    }
  }
  return sources;
}

export function collectBlogEnv() {
  return {
    dirs: listBlogDirs(),
    sources: collectBlogSources(),
    includes: listIncludes(PUBLIC),
  };
}
