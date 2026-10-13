export const CLIPPY_WORD = "fuckingclippy";
export const CLIPPY_LINK = `#${CLIPPY_WORD}`;
export const CLIPPY_CLICKS = 8;
export const CLIPPY_CLICK_WINDOW_MS = 10_000;

/** Tracks typed characters; reports true when the trigger word was just completed. */
export function createWordMatcher(word = CLIPPY_WORD) {
  let progress = 0;
  return (key: string): boolean => {
    if (key.length !== 1) return false;
    const char = key.toLowerCase();
    progress =
      char === word[progress] ? progress + 1 : char === word[0] ? 1 : 0;
    if (progress < word.length) return false;
    progress = 0;
    return true;
  };
}

/** Reports true once `count` clicks landed within `windowMs`. */
export function createBurstCounter(
  count = CLIPPY_CLICKS,
  windowMs = CLIPPY_CLICK_WINDOW_MS,
) {
  let stamps: number[] = [];
  return (now = Date.now()): boolean => {
    stamps = [...stamps.filter((t) => now - t < windowMs), now];
    if (stamps.length < count) return false;
    stamps = [];
    return true;
  };
}
