type ArenaBucket = {
    idle: HTMLAudioElement[];
    active: Set<HTMLAudioElement>;
};

const MAX_ALLOCATIONS_PER_SECOND = 90;
const ALLOCATION_WINDOW_MS = 1000;

const audioArena = {
    buckets: new Map<string, ArenaBucket>(),
    allocationTimestamps: [] as number[],
};

const getOrCreateBucket = (src: string): ArenaBucket => {
    let bucket = audioArena.buckets.get(src);
    if (!bucket) {
        bucket = { idle: [], active: new Set<HTMLAudioElement>() };
        audioArena.buckets.set(src, bucket);
    }
    return bucket;
};

const trimAllocationWindow = (now: number) => {
    audioArena.allocationTimestamps = audioArena.allocationTimestamps.filter(
        (timestamp) => now - timestamp < ALLOCATION_WINDOW_MS,
    );
};

const canAllocateAudio = () => {
    const now = Date.now();
    trimAllocationWindow(now);
    return audioArena.allocationTimestamps.length < MAX_ALLOCATIONS_PER_SECOND;
};

const markAllocation = () => {
    audioArena.allocationTimestamps.push(Date.now());
};

const releaseToPool = (src: string, audio: HTMLAudioElement) => {
    const bucket = getOrCreateBucket(src);
    if (!bucket.active.has(audio)) {
        return;
    }

    bucket.active.delete(audio);
    audio.pause();
    audio.currentTime = 0;
    bucket.idle.push(audio);
};

const allocateAudio = (src: string): HTMLAudioElement | null => {
    if (!canAllocateAudio()) {
        return null;
    }

    const audio = new Audio(src);
    audio.preload = "auto";

    audio.addEventListener("ended", () => {
        releaseToPool(src, audio);
    });

    audio.addEventListener("error", () => {
        releaseToPool(src, audio);
    });

    markAllocation();
    return audio;
};

const acquireFromArena = (src: string): HTMLAudioElement | null => {
    const bucket = getOrCreateBucket(src);

    const reusable = bucket.idle.pop();
    if (reusable) {
        bucket.active.add(reusable);
        return reusable;
    }

    const allocated = allocateAudio(src);
    if (!allocated) {
        return null;
    }

    bucket.active.add(allocated);
    return allocated;
};

export const playLayeredAudio = (src: string) => {
    const audio = acquireFromArena(src);
    if (!audio) {
        return;
    }

    audio.currentTime = 0;
    void audio.play().catch(() => {
        releaseToPool(src, audio);
    });
};