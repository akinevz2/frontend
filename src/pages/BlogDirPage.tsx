import { blogDirListed, blogDirListing, findBlogDir } from "@/content";
import { useSignals } from "@/lib/signals";
import { useLocation } from "react-router-dom";
import { PageWindows } from "@/window";

/** A configured directory under /blog/ (src/content/blogDirs.ts): the
 * page is the directory's LISTING — one window naming each shown file,
 * linked to its post page or raw asset. The route exists only for
 * configured directories (resolveRoute), so an unconfigured pathname
 * renders nothing here.
 *
 * The title-bar Minimize and ✕ fold UP a level: the page's onLeave (the
 * depth-0 fold — the same wiring that returns a project page to its
 * index) navigates to the directory above, with the fold animation and
 * the navigating sounds the window system already owns. The parent is
 * the literal parent path; when that parent is a blog subdirectory that
 * does not list (an opted-out shelf), the fold lands on the blog root
 * instead of a dead end. */
export const BlogDirPage = () => {
  const { pathname } = useLocation();
  const { dispatch } = useSignals();
  const listing = blogDirListing(pathname);
  if (!listing) return null;
  const parent = pathname.replace(/\/+$/, "").replace(/\/[^/]*$/, "") || "/";
  const parentLists =
    parent === "/blog" ||
    (Boolean(findBlogDir(parent)) && blogDirListed(parent));
  return (
    <PageWindows
      content={listing}
      onLeave={() =>
        dispatch("app:navigate", { to: parentLists ? parent : "/blog" })
      }
    />
  );
};
