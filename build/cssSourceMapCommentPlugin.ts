import type { Plugin } from "vite";

/**
 * Strips the sourceMappingURL comments the stylesheet libraries (xp.css's
 * 98.css) ship inside their own CSS. The bundler concatenates the sources
 * verbatim (cssMinify is false for readability), so those comments survive
 * into the bundle — Firefox then requests `<asset-dir>/98.css.map` and
 * logs a 404 source-map error, because the maps are not deployed (the
 * bundle is not one-to-one with its sources).
 */
export function cssSourceMapCommentPlugin(): Plugin {
  return {
    name: "css-source-map-comment",
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== "asset") continue;
        if (!/\.css$/.test(file.fileName)) continue;
        if (typeof file.source !== "string") continue;
        const stripped = file.source.replace(
          /\/\*[#@]\s*sourceMappingURL=[^*]*\*\/\s*/g,
          "",
        );
        if (stripped !== file.source) file.source = stripped;
      }
    },
  };
}
