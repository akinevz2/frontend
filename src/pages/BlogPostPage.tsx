import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { PageWindows } from "@/window";

/** A markdown file from public/blog/, addressed directly by its URL. */
export const BlogPostPage = () => {
  const { pathname } = useLocation();
  const content = useMemo(() => {
    const src = decodeURI(pathname);
    return {
      heading: src.split("/").pop() ?? src,
      embed: `${pathname}.md`,
    };
  }, [pathname]);
  return <PageWindows content={content} />;
};
