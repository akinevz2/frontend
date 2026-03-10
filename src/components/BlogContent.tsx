import { useEffect, useState } from "react";

import { PageContent } from "./Page";
import postsFallback from "../posts.json";
import { processContent } from "../windowing/utils";
import type { PageMetadata, SectionProps } from "../windowing";

type BlogState = {
  sections?: SectionProps | SectionProps[];
  metadata: PageMetadata;
  error?: string;
};

function isSectionPayload(
  value: unknown,
): value is SectionProps | SectionProps[] {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return true;
  return "heading" in value || "content" in value;
}

const BLOG_POSTS_URL =
  import.meta.env.PUBLIC_BLOG_POSTS_URL ||
  "https://raw.githubusercontent.com/akinevz2/frontend/blog-posts/posts.json";

function buildBlogState(content: SectionProps | SectionProps[]): BlogState {
  const { processed, metadata } = processContent(content);
  return {
    sections: processed,
    metadata: { sections: metadata },
  };
}

export default function BlogContent() {
  const [blogState, setBlogState] = useState<BlogState>(() =>
    buildBlogState(postsFallback as SectionProps),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(BLOG_POSTS_URL, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (!isSectionPayload(payload)) {
          throw new Error("Invalid posts schema");
        }

        if (!cancelled) {
          setBlogState(buildBlogState(payload));
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          setBlogState((previous) => ({
            ...previous,
            error: `Failed to fetch remote posts (${message}). Showing local fallback posts.`,
          }));
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {blogState.error ? <p className="status-bar">{blogState.error}</p> : null}
      <PageContent
        sections={blogState.sections}
        pageMetadata={blogState.metadata}
      />
    </>
  );
}
