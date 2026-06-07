const CLIPPY_SEQUENCE = 'fuckingclippy';
const CLIPPY_SEQUENCE_LENGTH = CLIPPY_SEQUENCE.length;

const CLIPPY_SESSION_KEY = 'kroflmao_ui_var';

let sequenceProgress = 0;
let allowFullVolumeTail = false;
let listenerAttached = false;

const audio = new Audio('/yooh.mp3');
const tadaAudio = new Audio('/tada.wav');

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

export const onClippyClick = () => {
    allowFullVolumeTail = false;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
    tadaAudio.currentTime = 0;
    void tadaAudio.play().catch(() => {});

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

let currentVisibility = sessionStorage.getItem(CLIPPY_SESSION_KEY) === '1';

export const subscribeClippyVisibility = (
    callback: (visible: boolean) => void,
): (() => void) => {
    visibilitySubscribers.add(callback);
    callback(currentVisibility);
    return () => visibilitySubscribers.delete(callback);
};

const setVisible = (visible: boolean) => {
    currentVisibility = visible;
    sessionStorage.setItem(CLIPPY_SESSION_KEY, visible ? '1' : '0');
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

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    const key = event.key.toLowerCase();
    if (key.length !== 1 || key < 'a' || key > 'z') {
        return;
    }

    if (key === CLIPPY_SEQUENCE[sequenceProgress]) {
        sequenceProgress += 1;
        startOrUpdateAudio(sequenceProgress);

        if (sequenceProgress === CLIPPY_SEQUENCE_LENGTH) {
            setVisible(true);
            audio.volume = 1;
            allowFullVolumeTail = true;
            sequenceProgress = 0;
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
    window.addEventListener('keydown', handleKeyDown);
    audio.addEventListener('ended', onAudioEnded);
    listenerAttached = true;
};

export const detachClippyListener = () => {
    window.removeEventListener('keydown', handleKeyDown);
    audio.removeEventListener('ended', onAudioEnded);
    listenerAttached = false;
    allowFullVolumeTail = false;
    resetAudio();
};
