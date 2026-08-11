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
// Total active clicking time required to summon Clippy, in ms.
const TRIGGER_SUMMON_MS = 3_690;
// Assumed length of /yooh.mp3; used to budget the blip cut-off curve.
const TRIGGER_AUDIO_LENGTH_MS = 3_220;
const TRIGGER_BLIP_FADE_MS = 650;
// The first audible cutoff (shortest blip) in ms. Each subsequent click
// extends the roll so the audio plays longer the more the user keeps clicking.
const TRIGGER_FIRST_BLIP_MS = 120;
const TRIGGER_LAST_BLIP_MS = TRIGGER_AUDIO_LENGTH_MS - TRIGGER_BLIP_FADE_MS;

// Cumulative active clicking time across the current burst. When this reaches
// TRIGGER_SUMMON_MS, Clippy is summoned. Reset to 0 whenever clicking stops.
let triggerActiveMs = 0;
// Wall-clock timestamp of the click that opened the current blip, so we can
// accumulate how much of the audio has actually played.
let triggerBlipStartTs = 0;
let triggerBlipTimeout: ReturnType<typeof setTimeout> | null = null;
let triggerBlipFadeInterval: ReturnType<typeof setInterval> | null = null;
let triggerBlipFadeStart = 0;
let triggerBlipFadeVolume = 0;

// Roll duration for a non-summoning tap. Grows on a logarithmic curve from
// TRIGGER_FIRST_BLIP_MS up to the full audio length minus the fade, based on
// how much active clicking time has accumulated so far.
const triggerBlipRollMs = (activeMs: number): number => {
  const ratio = Math.min(1, activeMs / TRIGGER_SUMMON_MS);
  const logRatio = Math.log(1 + ratio * (Math.E - 1)); // 0 → 1 log curve
  return Math.round(
    TRIGGER_FIRST_BLIP_MS +
      (TRIGGER_LAST_BLIP_MS - TRIGGER_FIRST_BLIP_MS) * logRatio,
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
    // accumulated active time so the next attempt starts from scratch.
    triggerActiveMs = 0;
    triggerBlipStartTs = 0;
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
 * cumulative active-time counter. The audio cutoff grows with each click
 * (starting at 350ms) so fewer clicks cut it off faster. When the accumulated
 * active clicking reaches 3.960s, Clippy is summoned at full volume. If the
 * user stops clicking, the fade-out fires and the counter resets.
 */
export const onClippyTriggerClick = () => {
  clearTriggerBlipCutoff();

  // Accumulate the time the previous blip actually played before this click.
  if (triggerBlipStartTs > 0) {
    triggerActiveMs += Date.now() - triggerBlipStartTs;
  }

  if (triggerActiveMs >= TRIGGER_SUMMON_MS) {
    triggerActiveMs = 0;
    triggerBlipStartTs = 0;
    summonClippy();
    return;
  }

  triggerBlipStartTs = Date.now();
  const rollMs = triggerBlipRollMs(triggerActiveMs);
  const volumeRatio = Math.min(1, triggerActiveMs / TRIGGER_SUMMON_MS);
  startOrUpdateAudio(volumeRatio);
  scheduleTriggerBlipCutoff(rollMs);
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
  triggerActiveMs = 0;
  triggerBlipStartTs = 0;
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

const startOrUpdateAudio = (volumeRatio: number) => {
  if (audio.paused) {
    audio.currentTime = 0;
  }
  audio.volume = Math.min(1, Math.max(0, volumeRatio));
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
    startOrUpdateAudio(sequenceProgress / CLIPPY_SEQUENCE_LENGTH);

    if (sequenceProgress === CLIPPY_SEQUENCE_LENGTH) {
      summonClippy();
    }

    return;
  }

  sequenceProgress = key === CLIPPY_SEQUENCE[0] ? 1 : 0;
  if (sequenceProgress > 0) {
    startOrUpdateAudio(sequenceProgress / CLIPPY_SEQUENCE_LENGTH);
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
  triggerActiveMs = 0;
  triggerBlipStartTs = 0;
  clearTriggerBlipCutoff();
  resetAudio();
};
