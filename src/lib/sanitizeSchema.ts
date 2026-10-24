import { defaultSchema } from "rehype-sanitize";

/**
 * Sanitize schema shared by every Markdown pipeline (src/lib/markdown.tsx)
 * and its test mirror (test/youtubeEmbed.test.js), so the pipeline and the
 * tests can never drift apart.
 *
 * On top of the defaults it allows:
 * - <iframe> (YouTube embeds via rehypeYoutubeEmbed, or hand-written raw
 *   HTML), including the attributes those embeds need — `style` for
 *   responsive sizing, `referrerPolicy` for YouTube's error-153 fix;
 * - `style` and `loading` on <img> (inline content images).
 */
export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), "style", "loading"],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "allow",
      "allowFullScreen",
      "loading",
      "style",
      "referrerPolicy",
    ],
  },
};
