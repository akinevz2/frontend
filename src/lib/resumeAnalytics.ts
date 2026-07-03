import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from "firebase/analytics";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

type EventParam = string | number | boolean;

type ResumeInterestPayload = {
  email: string;
  source: "resume_page";
  userAgent: string;
  createdAt: ReturnType<typeof serverTimestamp>;
};

const getRequiredValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const getFirebaseApp = (): FirebaseApp | null => {
  const apiKey = getRequiredValue(import.meta.env.VITE_FIREBASE_API_KEY);
  const authDomain = getRequiredValue(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  );
  const projectId = getRequiredValue(import.meta.env.VITE_FIREBASE_PROJECT_ID);
  const appId = getRequiredValue(import.meta.env.VITE_FIREBASE_APP_ID);

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  const messagingSenderId = getRequiredValue(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  );
  const storageBucket = getRequiredValue(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  );
  const measurementId = getRequiredValue(
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  );

  const existingApp = getApps()[0];
  if (existingApp) {
    return existingApp;
  }

  return initializeApp({
    apiKey,
    authDomain,
    projectId,
    appId,
    ...(messagingSenderId ? { messagingSenderId } : {}),
    ...(storageBucket ? { storageBucket } : {}),
    ...(measurementId ? { measurementId } : {}),
  });
};

let analyticsPromise: Promise<Analytics | null> | null = null;
let firestoreClient: Firestore | null = null;

const RESUME_INTEREST_LAST_SUBMIT_KEY = "resumeInterestLastSubmitAt";
const MIN_SUBMIT_INTERVAL_MS = 30_000;

const getAnalyticsClient = async () => {
  if (analyticsPromise) {
    return analyticsPromise;
  }

  analyticsPromise = (async () => {
    const app = getFirebaseApp();
    if (!app) {
      return null;
    }

    const analyticsSupported = await isSupported();
    if (!analyticsSupported) {
      return null;
    }

    return getAnalytics(app);
  })();

  return analyticsPromise;
};

const getFirestoreClient = () => {
  if (firestoreClient) {
    return firestoreClient;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  firestoreClient = getFirestore(app);
  return firestoreClient;
};

const isSubmitRateLimited = () => {
  const lastSubmitAtRaw = window.localStorage.getItem(
    RESUME_INTEREST_LAST_SUBMIT_KEY,
  );
  if (!lastSubmitAtRaw) {
    return false;
  }

  const lastSubmitAt = Number(lastSubmitAtRaw);
  if (!Number.isFinite(lastSubmitAt)) {
    return false;
  }

  return Date.now() - lastSubmitAt < MIN_SUBMIT_INTERVAL_MS;
};

export const trackResumeEvent = async (
  eventName: string,
  params: Record<string, EventParam> = {},
) => {
  try {
    const analytics = await getAnalyticsClient();
    if (!analytics) {
      return;
    }

    logEvent(analytics, eventName, params);
  } catch {
    // Non-blocking analytics.
  }
};

export const submitResumeInterest = async (email: string) => {
  if (isSubmitRateLimited()) {
    throw new Error("Please wait before submitting again.");
  }

  const firestore = getFirestoreClient();
  if (!firestore) {
    throw new Error("Missing Firebase configuration.");
  }

  const payload: ResumeInterestPayload = {
    email: email.trim().toLowerCase(),
    source: "resume_page",
    userAgent: window.navigator.userAgent || "unknown",
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(firestore, "resume_interest"), payload);
  } catch {
    await trackResumeEvent("resume_interest_submit_failed", {
      status_code: 500,
    });
    throw new Error("Failed to submit resume interest.");
  }

  window.localStorage.setItem(
    RESUME_INTEREST_LAST_SUBMIT_KEY,
    String(Date.now()),
  );

  await trackResumeEvent("resume_interest_submit", {
    status: "ok",
  });
};
