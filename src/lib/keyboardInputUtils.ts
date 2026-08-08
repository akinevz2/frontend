import { playLayeredAudio } from "./audioOverlap";

const CLIPPY_SEQUENCE = "fuckingclippy";
const CLIPPY_SEQUENCE_LENGTH = CLIPPY_SEQUENCE.length;

const CLIPPY_SESSION_KEY = "kroflmao_ui_var";

const isMobilePhoneDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  type NavigatorWithUserAgentData = Navigator & {
    userAgentData?: {
      mobile?: boolean;
    };
  };

  const navigatorWithUserAgentData = navigator as NavigatorWithUserAgentData;
  if (navigatorWithUserAgentData.userAgentData?.mobile) {
    return true;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  return /(iphone|ipod|android.*mobile|windows phone|blackberry|iemobile|opera mini)/.test(
    userAgent,
  );
};

let sequenceProgress = 0;
let allowFullVolumeTail = false;
let listenerAttached = false;

const audio = new Audio("/yooh.mp3");

const visibilitySubscribers = new Set<(visible: boolean) => void>();
const bubbleSubscribers = new Set<(visible: boolean) => void>();

let bubbleVisible = false;
let bubbleTimeout: ReturnType<typeof setTimeout> | null = null;

const CLIPPY_CLICK_THRESHOLD = 8;
const CLIPPY_CLICK_WINDOW_MS = 10_000;
const BUBBLE_DISMISS_MS = 8_000;
const TRIGGER_CLICK_THRESHOLD = 7;
// Assumed length of /yooh.mp3; used to budget the blip cut-off curve.
const TRIGGER_AUDIO_LENGTH_MS = 2_000;
const TRIGGER_BLIP_FADE_MS = 400;
// Blip roll runs from here (first audible tap) up to the full audio length
// minus the fade, so roll + fade-out for the final tap spans the whole 2s.
const TRIGGER_FIRST_BLIP_MS = 400;
const TRIGGER_LAST_BLIP_MS = TRIGGER_AUDIO_LENGTH_MS - TRIGGER_BLIP_FADE_MS;

let triggerClickCount = 0;
let triggerBlipTimeout: ReturnType<typeof setTimeout> | null = null;
let triggerBlipFadeInterval: ReturnType<typeof setInterval> | null = null;
let triggerBlipFadeStart = 0;
let triggerBlipFadeVolume = 0;

// Roll duration for a non-summoning tap, on a logarithmic curve: it grows with
// the click count but with diminishing increments, so the portion of the 2s
// audio that gets cut off gets smaller as the summon approaches.
const triggerBlipRollMs = (count: number): number => {
  const startIndex = 2;
  const endIndex = TRIGGER_CLICK_THRESHOLD - 1;
  const x = count - startIndex + 1;
  const xMax = endIndex - startIndex + 1;
  const ratio = Math.log(x) / Math.log(xMax);
  return Math.round(
    TRIGGER_FIRST_BLIP_MS +
      (TRIGGER_LAST_BLIP_MS - TRIGGER_FIRST_BLIP_MS) * ratio,
  );
};

/**
 * The click-repeat algorithm: buffers click timestamps and, once
 * `CLIPPY_CLICK_THRESHOLD` clicks land within `CLIPPY_CLICK_WINDOW_MS`, runs
 * `onThreshold`. Each call site gets its own independent buffer.
 */
const makeClickRepeatHandler = (onThreshold: () => void) => {
  let clickTimestamps: number[] = [];
  return () => {
    const now = Date.now();
    clickTimestamps = clickTimestamps.filter(
      (t) => now - t < CLIPPY_CLICK_WINDOW_MS,
    );
    clickTimestamps.push(now);

    if (clickTimestamps.length >= CLIPPY_CLICK_THRESHOLD) {
      clickTimestamps = [];
      onThreshold();
    }
  };
};

const setBubbleVisible = (visible: boolean) => {
  bubbleVisible = visible;
  bubbleSubscribers.forEach((cb) => cb(visible));
};

export const subscribeClippyBubble = (
  callback: (visible: boolean) => void,
): (() => void) => {
  bubbleSubscribers.add(callback);
  callback(bubbleVisible);
  return () => bubbleSubscribers.delete(callback);
};

export const showClippyHint = () => {
  if (bubbleTimeout !== null) {
    clearTimeout(bubbleTimeout);
  }

  setBubbleVisible(true);
  bubbleTimeout = setTimeout(() => {
    setBubbleVisible(false);
    bubbleTimeout = null;
  }, BUBBLE_DISMISS_MS);
};

const clippyImageClickHandler = makeClickRepeatHandler(() => {
  if (bubbleTimeout !== null) {
    clearTimeout(bubbleTimeout);
  }
  setBubbleVisible(true);
  bubbleTimeout = setTimeout(() => {
    setBubbleVisible(false);
    bubbleTimeout = null;
  }, BUBBLE_DISMISS_MS);
});

const clearTriggerBlipCutoff = () => {
  if (triggerBlipTimeout !== null) {
    clearTimeout(triggerBlipTimeout);
    triggerBlipTimeout = null;
  }
  if (triggerBlipFadeInterval !== null) {
    clearInterval(triggerBlipFadeInterval);
    triggerBlipFadeInterval = null;
  }
};

const triggerBlipFadeStep = () => {
  const elapsed = Date.now() - triggerBlipFadeStart;
  const progress = Math.min(1, elapsed / TRIGGER_BLIP_FADE_MS);
  audio.volume = triggerBlipFadeVolume * (1 - progress);

  if (progress >= 1) {
    if (triggerBlipFadeInterval !== null) {
      clearInterval(triggerBlipFadeInterval);
      triggerBlipFadeInterval = null;
    }
    // The audio has cut out, so the partial sequence is abandoned: clear the
    // click counter so the next attempt has to be built up from scratch.
    triggerClickCount = 0;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
    allowFullVolumeTail = false;
  }
};

// A non-summoning tap rolls on for a few ms and then fades out instead of
// being cut off abruptly, so a partial spam never leaves the summoning audio
// playing on its own.
const scheduleTriggerBlipCutoff = (rollMs: number) => {
  clearTriggerBlipCutoff();
  triggerBlipTimeout = setTimeout(() => {
    triggerBlipTimeout = null;
    triggerBlipFadeStart = Date.now();
    triggerBlipFadeVolume = audio.volume;
    triggerBlipFadeInterval = setInterval(triggerBlipFadeStep, 30);
  }, rollMs);
};

export const onClippyClick = () => {
  allowFullVolumeTail = false;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0;
  playLayeredAudio("/tada.wav");

  clippyImageClickHandler();
};

/**
 * The "fuckingclippy" trigger-word alternative sequence: each tap advances a
 * counter, and the 7th tap summons Clippy at full volume with the audio cue.
 * The first tap is silent, the next few play short blips that get longer with
 * each tap, and if the audio cuts out before the 7th tap the counter resets.
 */
export const onClippyTriggerClick = () => {
  clearTriggerBlipCutoff();

  triggerClickCount += 1;

  if (triggerClickCount >= TRIGGER_CLICK_THRESHOLD) {
    triggerClickCount = 0;
    summonClippy();
    return;
  }

  if (triggerClickCount === 1) {
    // First tap of a burst: deliberately silent ("click once, see nothing").
    return;
  }

  startOrUpdateAudio(triggerClickCount);
  scheduleTriggerBlipCutoff(triggerBlipRollMs(triggerClickCount));
};

let currentVisibility =
  sessionStorage.getItem(CLIPPY_SESSION_KEY) === "1" || isMobilePhoneDevice();

export const subscribeClippyVisibility = (
  callback: (visible: boolean) => void,
): (() => void) => {
  visibilitySubscribers.add(callback);
  callback(currentVisibility);
  return () => visibilitySubscribers.delete(callback);
};

const setVisible = (visible: boolean) => {
  currentVisibility = visible;
  sessionStorage.setItem(CLIPPY_SESSION_KEY, visible ? "1" : "0");
  visibilitySubscribers.forEach((cb) => cb(visible));
};

// Full Clippy summon: reveal the mascot, play the full-volume audio cue tail,
// and open the payoff tab. Shared by the keyboard sequence and the
// "fuckingclippy" trigger-word click sequence.
const summonClippy = () => {
  clearTriggerBlipCutoff();
  setVisible(true);
  sequenceProgress = 0;
  triggerClickCount = 0;
  if (audio.paused) {
    audio.currentTime = 0;
  }
  audio.volume = 1;
  allowFullVolumeTail = true;
  void audio.play().catch(() => {
    // Autoplay may be blocked before the first user gesture.
  });
  window.open("https://akinevz.com/lol.jpg", "_blank", "noopener,noreferrer");
};

const resetAudio = () => {
  if (allowFullVolumeTail) {
    return;
  }
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0;
};

const startOrUpdateAudio = (matched: number) => {
  if (audio.paused) {
    audio.currentTime = 0;
  }
  audio.volume = Math.min(1, Math.max(0, matched / CLIPPY_SEQUENCE_LENGTH));
  void audio.play().catch(() => {
    // Autoplay may be blocked before the first user gesture.
  });
};

const onAudioEnded = () => {
  allowFullVolumeTail = false;
  audio.currentTime = 0;
  audio.volume = 0;
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (isTypingTarget(event.target)) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key.length !== 1 || key < "a" || key > "z") {
    return;
  }

  if (key === CLIPPY_SEQUENCE[sequenceProgress]) {
    sequenceProgress += 1;
    startOrUpdateAudio(sequenceProgress);

    if (sequenceProgress === CLIPPY_SEQUENCE_LENGTH) {
      summonClippy();
    }

    return;
  }

  sequenceProgress = key === CLIPPY_SEQUENCE[0] ? 1 : 0;
  if (sequenceProgress > 0) {
    startOrUpdateAudio(sequenceProgress);
    return;
  }

  resetAudio();
};

export const attachClippyListener = () => {
  if (listenerAttached) {
    return;
  }
  window.addEventListener("keydown", handleKeyDown);
  audio.addEventListener("ended", onAudioEnded);
  listenerAttached = true;
};

export const detachClippyListener = () => {
  window.removeEventListener("keydown", handleKeyDown);
  audio.removeEventListener("ended", onAudioEnded);
  listenerAttached = false;
  allowFullVolumeTail = false;
  triggerClickCount = 0;
  clearTriggerBlipCutoff();
  resetAudio();
};
