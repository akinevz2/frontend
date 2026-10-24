import { playLayeredAudio } from "./audio";
import { onSignal } from "./signals";
import {
  advanceWord,
  blipRollMs,
  CLIPPY_WORD,
  createBurstCounter,
  FADE_MS,
  SUMMON_MS,
} from "./clippyRules";

export const CLIPPY_LINK = `#${CLIPPY_WORD}`;

const SESSION_KEY = "kroflmao_ui_var";
const SUMMON_AUDIO = "/yooh.mp3";
const CLICK_AUDIO = "/tada.wav";
const PAYOFF_URL = "/lol.jpg";

const BUBBLE_MS = 8_000;

export type ClippyState = {
  visible: boolean;
  bubble: boolean;
  saysNo: boolean;
  /** The unhide list is shown instead of a bubble (masks it completely). */
  listOpen: boolean;
};

const storedVisible = () =>
  typeof sessionStorage !== "undefined" &&
  sessionStorage.getItem(SESSION_KEY) === "1";

let state: ClippyState = {
  visible: storedVisible(),
  bubble: false,
  saysNo: false,
  listOpen: false,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<ClippyState>) => {
  state = { ...state, ...patch };
  sessionStorage.setItem(SESSION_KEY, state.visible ? "1" : "0");
  listeners.forEach((l) => l());
};

export const subscribeClippy = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getClippyState = () => state;

let audio: HTMLAudioElement | undefined;
const getAudio = () => (audio ??= new Audio(SUMMON_AUDIO));

let fullTail = false;
let wordProgress = 0;
let activeMs = 0;
let blipStart = 0;
let blipTimer: ReturnType<typeof setTimeout> | undefined;
let fadeTimer: ReturnType<typeof setInterval> | undefined;
let bubbleTimer: ReturnType<typeof setTimeout> | undefined;

const play = (volume: number) => {
  const a = getAudio();
  if (a.paused) a.currentTime = 0;
  a.volume = Math.min(1, Math.max(0, volume));
  void a.play().catch(() => undefined);
};

const silence = () => {
  if (fullTail) return;
  const a = getAudio();
  a.pause();
  a.currentTime = 0;
  a.volume = 0;
};

const clearBlip = () => {
  clearTimeout(blipTimer);
  clearInterval(fadeTimer);
  blipTimer = fadeTimer = undefined;
};

const summon = () => {
  clearBlip();
  wordProgress = 0;
  activeMs = 0;
  blipStart = 0;
  set({ visible: true });
  const a = getAudio();
  if (a.paused) a.currentTime = 0;
  a.volume = 1;
  fullTail = true;
  void a.play().catch(() => undefined);
  window.open(PAYOFF_URL, "_blank", "noopener,noreferrer");
};

/** A tap on the trigger link: a short blip that grows until the audio unlocks Clippy. */
export const onClippyTriggerClick = () => {
  clearBlip();
  if (blipStart > 0) activeMs += Date.now() - blipStart;
  if (activeMs >= SUMMON_MS) return summon();

  blipStart = Date.now();
  play(activeMs / SUMMON_MS);
  blipTimer = setTimeout(() => {
    const a = getAudio();
    const started = Date.now();
    const from = a.volume;
    fadeTimer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - started) / FADE_MS);
      a.volume = from * (1 - progress);
      if (progress < 1) return;
      clearBlip();
      activeMs = 0;
      blipStart = 0;
      a.pause();
      a.currentTime = 0;
      a.volume = 0;
      fullTail = false;
    }, 30);
  }, blipRollMs(activeMs));
};

const hint = () => {
  clearTimeout(bubbleTimer);
  // The hint is the priority UI: dismiss the unhide list in the same
  // atomically-committed state update so it can never mask the bubble
  // (the stray "haha it said no"/hiding interplay of the flag mirrors).
  set({ bubble: true, saysNo: false, listOpen: false });
  bubbleTimer = setTimeout(
    // saysNo dies with its bubble: a stale veto would otherwise turn every
    // later bubble into "haha it said no" (visible the moment another
    // bubble is unmasked, e.g. dismissing the reopen list).
    () => set({ bubble: false, saysNo: false }),
    BUBBLE_MS,
  );
};

const imageBurst = createBurstCounter();

/** A click on the Clippy image itself. */
export const onClippyClick = () => {
  fullTail = false;
  const a = getAudio();
  a.pause();
  a.currentTime = 0;
  a.volume = 0;
  playLayeredAudio(CLICK_AUDIO);
  if (imageBurst()) hint();
};

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["input", "textarea", "select"].includes(target.tagName.toLowerCase()));

const onKeyDown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isTypingTarget(event.target)) return;
  const key = event.key.toLowerCase();
  if (!/^[a-z]$/.test(key)) return;

  const step = advanceWord(wordProgress, key);
  wordProgress = step.progress;
  if (step.done) return summon();
  if (wordProgress > 0) play(wordProgress / CLIPPY_WORD.length);
  else silence();
};

const onAudioEnded = () => {
  fullTail = false;
  const a = getAudio();
  a.currentTime = 0;
  a.volume = 0;
};

// A close attempt while the bubble is actually displayed makes Clippy
// refuse. listOpen lives in PUBLIC state now (single source of truth — the
// old component-to-lib mirror was effect-synchronized and could go stale,
// disarming the veto); the unhide list masks the bubble completely, so no
// refusal may fire then.
export const toggleClippyList = () => {
  if (state.listOpen) {
    set({ listOpen: false });
    return;
  }
  // Opening the list dismisses any speech bubble — including the "haha it
  // said no" veto state — so the reopen list owns the attention; pending
  // bubble timers are cancelled alongside.
  clearTimeout(bubbleTimer);
  set({ listOpen: true, bubble: false, saysNo: false });
};

const onCrunchy = ({ refuse }: { refuse: () => void }) => {
  if (state.listOpen || !state.bubble || state.saysNo) return;
  refuse();
  set({ saysNo: true });
};

/** Attaches the global listeners; returns the detach function. */
export function attachClippy(): () => void {
  window.addEventListener("keydown", onKeyDown);
  const offWindowClose = onSignal("window:close", onCrunchy);
  getAudio().addEventListener("ended", onAudioEnded);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    offWindowClose();
    getAudio().removeEventListener("ended", onAudioEnded);
    clearBlip();
    activeMs = 0;
    blipStart = 0;
    fullTail = false;
    silence();
  };
}
