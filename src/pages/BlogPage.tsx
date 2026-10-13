import { blog } from "@/content";
import { PageWindows } from "@/window";

/** Posts are static content windows; each post is addressable as ?post=slug. */
export const BlogPage = () => (
  <PageWindows content={blog} permalinkMode="post" />
);
