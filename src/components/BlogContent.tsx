import { useEffect, useState } from "react";

import { PageContent } from "./Page";
import { processContent } from "../windowing/utils";
import type { PageMetadata, SectionProps } from "../windowing";

type BlogState = {
  sections?: SectionProps | SectionProps[];
  metadata: PageMetadata;
  error?: string;
};

const LOADING_SECTION: SectionProps = {
  heading: "Loading...",
  content: [
    "![Loading spinner](/spinner.svg)",
    "Fetching posts from local frozen content",
  ],
};

function isSectionPayload(
  value: unknown,
): value is SectionProps | SectionProps[] {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return true;
  return "heading" in value || "content" in value;
}

const BLOG_POSTS_URL = "/blog/posts.json";

function buildBlogState(content: SectionProps | SectionProps[]): BlogState {
  const { processed, metadata } = processContent(content);
  return {
    sections: processed,
    metadata: { sections: metadata },
  };
}

export default function BlogContent() {
  const [blogState, setBlogState] = useState<BlogState>(() =>
    buildBlogState(LOADING_SECTION),
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
          setBlogState({
            metadata: { sections: [] },
            error: `Failed to fetch remote posts (${message}).`,
          });
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
        {...(blogState.sections ? { sections: blogState.sections } : {})}
        pageMetadata={blogState.metadata}
      />
    </>
  );
}
