/**
 * Section theme engine.
 *
 * A theme is a named styling variant applied to a `Section` via the `theme`
 * field on `SectionProps`. The engine is the single source of truth for:
 *  - the set of known theme names,
 *  - per-theme CSS class names applied to the section's window element,
 *  - per-theme markdown rehype plugin configuration, and
 *  - any per-theme behaviour (e.g. the experimental redirect).
 *
 * Today only the `experimental` theme is wired up; it is defined inline in
 * Section.tsx (EXPERIMENTAL_THEME / EXPERIMENTAL_THEME_REDIRECT_URL). The
 * intent of this module is to centralise that so themes are pluggable rather
 * than scattered as constants and string comparisons across Section.tsx.
 */

import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Options as ReactMarkdownOptions } from "react-markdown";

/**
 * The strongly-typed union of every `theme` value seen so far across the
 * content files and code. Add a new member here whenever a new theme is
 * introduced so the theme engine can exhaustively switch over it.
 *
 * Members, with where each is authored:
 *  - `default`       — implicit when a Section omits `theme` (the fallback).
 *  - `experimental`  — `sections.json` (×4), `public/blog/posts.json` (×2),
 *                      and the `EXPERIMENTAL_THEME` constant in Section.tsx.
 *  - `open`          — `addons.json` (root section, line 3). Not yet wired
 *                      up as a real theme; currently falls back to default.
 */
export type ThemeName = "default" | "experimental" | "centered" | "open";

/** The default (no-theme) theme name. Sections without `theme` use this. */
export const DEFAULT_THEME: ThemeName = "default";

/** Known theme names. Keep in sync with the entries in `THEMES`. */
export const EXPERIMENTAL_THEME: ThemeName = "experimental";
export const CENTERED_THEME: ThemeName = "centered";

/**
 * The URL the "experimental" theme navigates to on right-click. Centralised
 * here so the theme engine owns all theme behaviour.
 */
export const EXPERIMENTAL_THEME_REDIRECT_URL = "https://akinevz.dev";

/** Markdown sanitize schema shared by the default + experimental themes. */
const markdownSanitizeSchema: unknown = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "iframe"],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), ["target"], ["rel"]],
    img: [...(defaultSchema.attributes?.img || []), ["loading"], ["decoding"]],
    iframe: [
      ["title"],
      ["src"],
      ["width"],
      ["height"],
      ["style"],
      ["scrolling"],
      ["loading"],
      ["allow"],
      ["allowfullscreen"],
      ["referrerpolicy"],
      ["frameborder"],
    ],
  },
};

/** Rehype plugins for the default theme: raw + sanitised. */
export const defaultRehypePlugins = [
  rehypeRaw,
  [rehypeSanitize, markdownSanitizeSchema],
] as ReactMarkdownOptions["rehypePlugins"];

/** Rehype plugins for the experimental theme: raw, unsanitised. */
export const experimentalRehypePlugins = [
  rehypeRaw,
] as ReactMarkdownOptions["rehypePlugins"];

/** A registered theme. */
export interface ThemeDefinition {
  /** The `theme` string that selects this theme on a Section. */
  name: string;
  /** CSS class(es) applied to the section's `.window` element. */
  className: string;
  /** Rehype plugins used when rendering markdown inside this theme. */
  rehypePlugins: ReactMarkdownOptions["rehypePlugins"];
  /**
   * Optional URL to navigate to on a context-menu (right-click) inside the
   * section. When unset, the context menu is left to the browser.
   */
  contextMenuRedirectUrl?: string;
  /**
   * When true, sections using this theme always render with their content
   * revealed (expanded), ignoring the collapsed-by-default behaviour.
   */
  forceExpanded?: boolean;
  /**
   * When true, the section's window gets a 3D raise-and-wobble effect on
   * hover/focus: it lifts off the page (translateZ + shadow) and plays a
   * brief wobble keyframe animation. The CSS lives in main.css and targets
   * the window via its `[data-theme]` attribute (the theme name is rendered
   * as `data-theme` on the section's `.window` element, not as a class).
   */
  raiseWobble?: boolean;

  centered?: boolean;
}

/**
 * The registry of known themes. Looked up by `theme` name via
 * `resolveTheme()`. Add new themes here.
 */
export const THEMES: Record<string, ThemeDefinition> = {
  [DEFAULT_THEME]: {
    name: DEFAULT_THEME,
    className: "",
    rehypePlugins: defaultRehypePlugins,
  },
  [EXPERIMENTAL_THEME]: {
    name: EXPERIMENTAL_THEME,
    className: "theme-experimental",
    rehypePlugins: experimentalRehypePlugins,
    contextMenuRedirectUrl: EXPERIMENTAL_THEME_REDIRECT_URL,
    raiseWobble: true,
  },
  [CENTERED_THEME]: {
    name: CENTERED_THEME,
    className: "centered",
    rehypePlugins: defaultRehypePlugins,
    centered: true,
  },
  /** The "open" theme: content is always revealed. */
  open: {
    name: "open",
    className: "theme-open",
    rehypePlugins: defaultRehypePlugins,
    forceExpanded: true,
  },
};

/** Normalizes a theme input (string | string[] | undefined) to an array of strings. */
export function normalizeThemes(
  theme: string | string[] | undefined,
): string[] {
  if (!theme) return [];
  return Array.isArray(theme) ? theme : [theme];
}

/**
 * Resolve a (possibly undefined or array of) `theme` name(s) to ThemeDefinition(s).
 * Unknown theme names fall back to the default theme rather than throwing.
 */
export function resolveTheme(
  theme: string | string[] | undefined,
): ThemeDefinition {
  const themes = normalizeThemes(theme);
  // Return the first valid theme (or default if none)
  for (const t of themes) {
    if (Object.prototype.hasOwnProperty.call(THEMES, t)) {
      return THEMES[t]!;
    }
  }
  return THEMES[DEFAULT_THEME]!;
}

/** Resolve all themes to an array of ThemeDefinitions. */
export function resolveAllThemes(
  theme: string | string[] | undefined,
): ThemeDefinition[] {
  const themes = normalizeThemes(theme);
  if (themes.length === 0) return [THEMES[DEFAULT_THEME]!];
  return themes.map((t) =>
    Object.prototype.hasOwnProperty.call(THEMES, t)
      ? THEMES[t]!
      : THEMES[DEFAULT_THEME]!,
  );
}

/** Returns true if `theme` is a recognised theme name (besides the default). */
export function isKnownTheme(theme: string | undefined): boolean {
  return !!theme && theme !== DEFAULT_THEME && theme in THEMES;
}

/**
 * Returns the context-menu redirect URL for a theme, if any. Used by Section
 * to decide whether to intercept right-clicks inside a themed window.
 */
export function contextMenuRedirectUrlFor(
  theme: string | undefined,
): string | undefined {
  return resolveTheme(theme).contextMenuRedirectUrl;
}

/**
 * Whether a section with the given theme should always render expanded
 * (content revealed). Driven by the `forceExpanded` flag on the theme
 * definition. The `open` theme opts in.
 */
export function isForceExpandedTheme(
  theme: string | string[] | undefined,
): boolean {
  const themes = resolveAllThemes(theme);
  return themes.some((t) => t.forceExpanded === true);
}

/**
 * The shape of the per-theme post-processing input/output. Each theme branch
 * of `postProcessTheme` receives the resolved theme definition plus the
 * arbitrary payload it is allowed to transform. Rules to be implemented next
 * will extend this (and the per-theme overloads below) as needed.
 */
export interface PostProcessContext<TPayload> {
  theme: ThemeDefinition;
  payload: TPayload;
}

/**
 * Polymorphic per-theme post-processor.
 *
 * The dispatch is driven by the `ThemeName` union so that adding a new theme
 * is exhaustive: TypeScript will flag any `switch` arm that is missing once a
 * new member is added to the union. The function is overloaded per theme so
 * callers get a theme-specific return type when they pass a literal name.
 *
 * The bodies are intentionally TODO stubs — the concrete per-theme rules will
 * be implemented in order of importance next.
 */
export function postProcessTheme<TPayload>(
  name: ThemeName,
  context: PostProcessContext<TPayload>,
): PostProcessContext<TPayload> {
  switch (name) {
    case "default":
      return postProcessDefault(context);
    case "experimental":
      return postProcessExperimental(context);
    case "open":
      return postProcessOpen(context);
    case "centered":
      return context;
    default: {
      // Exhaustiveness check: if a new ThemeName is added without a
      // branch above, this line fails to type-check.
      const _exhaustive: never = name;
      void _exhaustive;
      return context;
    }
  }
}

/** Default-theme post-processing rules. TODO: implement. */
function postProcessDefault<TPayload>(
  context: PostProcessContext<TPayload>,
): PostProcessContext<TPayload> {
  return context;
}

/** Experimental-theme post-processing rules. TODO: implement. */
function postProcessExperimental<TPayload>(
  context: PostProcessContext<TPayload>,
): PostProcessContext<TPayload> {
  return context;
}

/** Open-theme post-processing rules. TODO: implement. */
function postProcessOpen<TPayload>(
  context: PostProcessContext<TPayload>,
): PostProcessContext<TPayload> {
  return context;
}
