import {
  blogDirListed,
  findBlogDir,
  type Section,
  type ThemeName,
} from "@/content";
import { useSignals } from "@/lib/signals";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageWindows } from "@/window";
import { stripTrailingSlashes } from "@/lib/slashes";

/** A markdown file from public/blog/, addressed directly by its URL.
 *
 * Posts may also be authored as .json Section trees (the same shape the
 * content JSON files use). The parent directory's generated snapshot
 * (src/content/blogDirs.json) tells the two forms apart: a `<name>.json`
 * entry in the listing means the address renders THAT file — fetched at
 * runtime and mounted through the same PageWindows tree any authored
 * post uses; everything else embeds the markdown `<path>.md`.
 *
 * A post INSIDE a listed blog directory folds UP a level: its title-bar
 * Minimize and ✕ navigate back to the parent directory's listing — the
 * same depth-0 onLeave fold the listing page itself uses. Posts at the
 * /blog root keep the plain page behaviour (their parent is the curated
 * blog page, not a directory listing). */
export const BlogPostPage = () => {
  const { pathname } = useLocation();
  const { dispatch } = useSignals();
  const content = useMemo(() => {
    const src = decodeURI(pathname);
    return {
      heading: src.split("/").pop() ?? src,
      embed: `${pathname}.md`,
    };
  }, [pathname]);
  const isJson = useMemo(() => {
    const parent =
      stripTrailingSlashes(pathname).replace(/\/[^/]*$/, "") || "/";
    const base = decodeURI(pathname).split("/").pop() ?? "";
    return Boolean(findBlogDir(parent)?.files.includes(`${base}.json`));
  }, [pathname]);
  const [jsonPost, setJsonPost] = useState<Section | null>(null);
  useEffect(() => {
    if (!isJson) return;
    let live = true;
    setJsonPost(null);
    fetch(`${pathname}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Section>;
      })
      .then((section) => {
        if (live) setJsonPost(section);
      })
      .catch(() => {
        if (live) setJsonPost(null);
      });
    return () => {
      live = false;
    };
  }, [isJson, pathname]);
  const parent = stripTrailingSlashes(pathname).replace(/\/[^/]*$/, "") || "/";
  const parentDir = findBlogDir(parent);
  const foldsUp = Boolean(parentDir) && blogDirListed(parentDir?.path ?? "");
  // A .md post's embed forces its window expanded; a .json post's tree
  // must read the same way — the root window opens (theme "open" merged
  // into whatever the author set) so its children mount, exactly like
  // the authored posts on the blog page itself.
  const post = useMemo(() => {
    if (!isJson) return content;
    if (!jsonPost) return null;
    const themes = jsonPost.theme
      ? Array.isArray(jsonPost.theme)
        ? jsonPost.theme
        : [jsonPost.theme]
      : [];
    return themes.includes("open")
      ? jsonPost
      : { ...jsonPost, theme: [...themes, "open"] as ThemeName[] };
  }, [isJson, jsonPost, content]);
  if (!post) return null;
  return (
    <PageWindows
      content={post}
      onLeave={
        foldsUp ? () => dispatch("app:navigate", { to: parent }) : undefined
      }
    />
  );
};
