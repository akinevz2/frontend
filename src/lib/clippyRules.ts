/** Pure rules of the Clippy easter egg (no DOM), kept separate so they are testable. */
export const CLIPPY_WORD = "fuckingclippy";
export const CLICKS_FOR_HINT = 8;
export const CLICK_WINDOW_MS = 10_000;
// Active clicking time that unlocks Clippy via the trigger link.
export const SUMMON_MS = 3_690;
export const AUDIO_LENGTH_MS = 3_220;
export const FADE_MS = 650;
const FIRST_BLIP_MS = 120;
const LAST_BLIP_MS = AUDIO_LENGTH_MS - FADE_MS;

/** Roll length of a non-summoning tap: grows on a log curve with active time. */
export const blipRollMs = (activeMs: number): number => {
  const ratio = Math.min(1, activeMs / SUMMON_MS);
  const curve = Math.log(1 + ratio * (Math.E - 1));
  return Math.round(FIRST_BLIP_MS + (LAST_BLIP_MS - FIRST_BLIP_MS) * curve);
};

/** Reports true once `count` clicks landed within `windowMs`. */
export function createBurstCounter(
  count = CLICKS_FOR_HINT,
  windowMs = CLICK_WINDOW_MS,
) {
  let stamps: number[] = [];
  return (now = Date.now()): boolean => {
    stamps = [...stamps.filter((t) => now - t < windowMs), now];
    if (stamps.length < count) return false;
    stamps = [];
    return true;
  };
}

/** Advances through the trigger word; true when the last letter lands. */
export function advanceWord(progress: number, key: string, word = CLIPPY_WORD) {
  const next = key === word[progress] ? progress + 1 : key === word[0] ? 1 : 0;
  const done = next === word.length;
  return { progress: done ? 0 : next, done };
}
