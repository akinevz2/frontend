import {
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "@firebase/app";
import { getAnalytics, isSupported, logEvent } from "@firebase/analytics";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from "@firebase/firestore";

const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = (): FirebaseApp | null => {
  if (
    !config.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.appId
  )
    return null;
  const options: FirebaseOptions = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    appId: config.appId,
  };
  for (const key of [
    "messagingSenderId",
    "storageBucket",
    "measurementId",
  ] as const) {
    if (config[key]) options[key] = config[key];
  }
  return getApps()[0] ?? initializeApp(options);
};

export const firebaseConfigured = () => app() !== null;

export async function trackResumeEvent(
  name: string,
  params: Record<string, string | number | boolean> = {},
) {
  const instance = app();
  if (!instance || !(await isSupported().catch(() => false))) return;
  logEvent(getAnalytics(instance), name, params);
}

export async function submitResumeInterest(email: string): Promise<void> {
  const instance = app();
  if (!instance) throw new Error("Interest submissions are not configured.");
  await addDoc(collection(getFirestore(instance), "resume_interest"), {
    email,
    source: "resume_page",
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp(),
  });
}
