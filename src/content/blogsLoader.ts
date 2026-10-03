import { z } from "zod";

export type BlogPost = z.infer<typeof BlogPost>;

const BlogPost = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().optional(),
  content: z.union([z.string(), z.array(z.string()), z.any()]),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional(),
  fullSlug: z.string().optional(),
  _id: z.string().optional(),
  published: z.boolean().optional(),
  updated: z.string().optional(),
});

export interface BlogPostWithFrontMatter extends BlogPost {
  content: string;
}

export interface BlogFrontMatter {
  id: string;
  title: string;
  date?: string;
  published?: boolean;
  updated?: string;
  slug?: string;
}

const BlogFrontMatter = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().optional(),
  published: z.boolean().optional(),
  updated: z.string().optional(),
  slug: z.string().optional(),
});

export type BlogFrontMatterType = z.infer<typeof BlogFrontMatter>;

export interface BlogPostEntry extends Record<string, any> { }

export const loadBlogPosts = async (): Promise<BlogPost[]> => {
  try {
    const response = await fetch("/src/data/blogPosts.json");
    if (!response.ok) {
      console.error("Failed to fetch blog posts:", response.status);
      return [];
    }

    const rawPosts = await response.json();
    return rawPosts.map((post: unknown) => {
      const parsed =
        typeof post === "object" && post !== null
          ? BlogPost.parse(post)
          : BlogPost.parse({} as BlogPost);
      return parsed;
    });
  } catch (error) {
    console.error("Error loading blog posts:", error);
    return [];
  }
};

export type BlogPostMetadata = {
  id: string;
  title: string;
  date?: string;
  excerpt?: string;
};

export interface BlogEntry {
  metadata: BlogFrontMatterType;
  content: string;
}

export const loadBlogEntry = async (
  slug: string,
): Promise<BlogEntry | null> => {
  try {
    const response = await fetch(`/src/data/blog/${slug}.md`);
    if (!response.ok) {
      console.error(`Failed to fetch blog entry ${slug}:`, response.status);
      return null;
    }

    const content = await response.text();
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontMatterMatch || !frontMatterMatch[1]) {
      return {
        metadata: {
          id: slug,
          title: slug,
          published: true,
        },
        content,
      };
    }

    const frontMatterStr = frontMatterMatch[1] ?? "";
    const metadata = BlogFrontMatter.safeParse(JSON.parse(frontMatterStr));

    if (!metadata.success) {
      return {
        metadata: {
          id: slug,
          title: slug,
          published: true,
        },
        content: content,
      };
    }

    return {
      metadata: metadata.data,
      content: content.replace(frontMatterMatch[0], "").trim(),
    };
  } catch (error) {
    console.error(`Error loading blog entry ${slug}:`, error);
    return null;
  }
};
