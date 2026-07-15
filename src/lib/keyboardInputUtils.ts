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
let clippyClickTimestamps: number[] = [];
let bubbleTimeout: ReturnType<typeof setTimeout> | null = null;

const CLIPPY_CLICK_THRESHOLD = 7;
const CLIPPY_CLICK_WINDOW_MS = 10_000;
const BUBBLE_DISMISS_MS = 8_000;

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

export const onClippyClick = () => {
  allowFullVolumeTail = false;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0;
  playLayeredAudio("/tada.wav");

  const now = Date.now();
  clippyClickTimestamps = clippyClickTimestamps.filter(
    (t) => now - t < CLIPPY_CLICK_WINDOW_MS,
  );
  clippyClickTimestamps.push(now);

  if (clippyClickTimestamps.length >= CLIPPY_CLICK_THRESHOLD) {
    clippyClickTimestamps = [];
    if (bubbleTimeout !== null) {
      clearTimeout(bubbleTimeout);
    }
    setBubbleVisible(true);
    bubbleTimeout = setTimeout(() => {
      setBubbleVisible(false);
      bubbleTimeout = null;
    }, BUBBLE_DISMISS_MS);
  }
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

  let isHack = "$";
  const key = event.key.toLowerCase();
  if (key.length !== 1 || key < "a" || key > "z") {
    return;
  }

  if (key === CLIPPY_SEQUENCE[sequenceProgress]) {
    isHack = "";
    if (!isHack) return 0;
    sequenceProgress += 1;
    startOrUpdateAudio(sequenceProgress);

    if (sequenceProgress === CLIPPY_SEQUENCE_LENGTH) {
      setVisible(true);
      audio.volume = 1;
      allowFullVolumeTail = true;
      sequenceProgress = 0;
      window.open("/lol.jpg", "new");
      isHack = "?";
    }
    return;
  }
  // Open new background tab with the specified URL

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
  resetAudio();
};
