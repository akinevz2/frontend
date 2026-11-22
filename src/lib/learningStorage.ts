/** Per-session summon persistence for lesson hints (docs/LEARNING_PLAN.md
 * §7.3): sessionStorage key `learning:<route path>` holding
 * `{ "v": 1, "summoned": [{ "id", "x", "y", "z" }] }`.
 *
 * Pure and parameterised by the Storage (tests pass a fake; jsdom may
 * hold the real one): every access is in try/catch — storage can throw
 * (quota, privacy mode) and the page must work without it. Corrupt or
 * unknown-shaped payloads read as "nothing summoned", never as an
 * error. Written on MUTATION (summon, close; drop/raise arrive with
 * Phase 4's dragging), never during pointermove. No cookies, no
 * localStorage, no network, no analytics.
 */

export type SummonedEntry = { id: string; x: number; y: number; z: number };

/** The storage key for one route path. */
export const learningKey = (routePath: string): string =>
  `learning:${routePath}`;

const isEntry = (value: unknown): value is SummonedEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { id?: unknown }).id === "string" &&
  Number.isFinite((value as { x?: unknown }).x) &&
  Number.isFinite((value as { y?: unknown }).y) &&
  Number.isFinite((value as { z?: unknown }).z);

const defaultStorage = (): Storage | undefined =>
  typeof sessionStorage === "undefined" ? undefined : sessionStorage;

/** The persisted summon entries for a route — [] when storage is
 * unavailable, the key is absent, or the payload is corrupt/incomplete. */
export function readSummoned(
  routePath: string,
  storage: Storage | undefined = defaultStorage(),
): SummonedEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(learningKey(routePath));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { v?: unknown }).v !== 1 ||
      !Array.isArray((parsed as { summoned?: unknown }).summoned)
    ) {
      return [];
    }
    return (parsed as { summoned: unknown[] }).summoned.filter(isEntry);
  } catch {
    return [];
  }
}

/** Persists the summon entries for a route. Answers false when storage
 * is unavailable or the write throws (the page works without it). */
export function writeSummoned(
  routePath: string,
  entries: SummonedEntry[],
  storage: Storage | undefined = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      learningKey(routePath),
      JSON.stringify({ v: 1, summoned: entries }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Removes one id from the entries (a dismissal), preserving order. */
export function withoutEntry(
  entries: SummonedEntry[],
  id: string,
): SummonedEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

/** Raises one entry to the top z (above every other) — Phase 4's drag
 * raise uses it; summon uses it to stack newest-on-top. */
export function raised(
  entries: SummonedEntry[],
  id: string,
): { entries: SummonedEntry[]; top: number } {
  const others = withoutEntry(entries, id);
  const top = others.reduce((max, e) => Math.max(max, e.z), 0) + 1;
  const entry = entries.find((e) => e.id === id);
  if (!entry) return { entries: others, top };
  return { entries: [...others, { ...entry, z: top }], top };
}

/** A rectangle in container-relative space (plain numbers — pure, no
 * DOM needed for tests). */
export type Rect = { left: number; top: number; width: number; height: number };

/** The summoned hint's deterministic rest position (docs/
 * LEARNING_PLAN.md §7.2, revised per the author): the CENTRE of the
 * page — a fresh summon always lands here, so dismiss → re-summon
 * cannot wander. Pure. */
export function summonResting(
  viewport: { width: number; height: number },
  hint: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.max(0, (viewport.width - hint.width) / 2),
    y: Math.max(0, (viewport.height - hint.height) / 2),
  };
}

/** The summon ENTRANCE offset (docs/LEARNING_PLAN.md §7.2, revised per
 * the author): the hint starts OFFSCREEN below the viewport and
 * crosses the BOTTOM edge, gliding to its rest position. With a mouse
 * position known, the crossing point is offset to the mouse's x — a
 * non-orthogonal (diagonal) path; without one (keyboard summon), it
 * rises straight up (orthogonal). `sx`/`sy` are the CSS-var start
 * offsets the entrance animation animates away; pure — unit-tested.
 * Position is viewport-space (position: fixed). */
export function summonEntrance(
  rest: { x: number; y: number },
  viewport: { width: number; height: number },
  hint: { width: number; height: number },
  mouseX: number | undefined,
): { sx: number; sy: number } {
  const crossX =
    mouseX === undefined
      ? rest.x
      : Math.min(
          Math.max(0, mouseX - hint.width / 2),
          Math.max(0, viewport.width - hint.width),
        );
  return {
    sx: crossX - rest.x,
    sy: viewport.height - rest.y,
  };
}

/** Clamps an entry back inside the viewport (a restore of positions a
 * resized viewport no longer has room for). Plain-number bounds: pure
 * and testable. */
export function clampEntry(
  entry: SummonedEntry,
  bounds: { maxX: number; maxY: number },
): SummonedEntry {
  return {
    ...entry,
    x: Math.min(Math.max(0, entry.x), Math.max(0, bounds.maxX)),
    y: Math.min(Math.max(0, entry.y), Math.max(0, bounds.maxY)),
  };
}
