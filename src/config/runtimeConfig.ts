type OptionalString = string | null;

type FirebasePublicConfig = Readonly<{
  apiKey: OptionalString;
  authDomain: OptionalString;
  projectId: OptionalString;
  storageBucket: OptionalString;
  messagingSenderId: OptionalString;
  appId: OptionalString;
  measurementId: OptionalString;
}>;

type RuntimeConfig = Readonly<{
  isDev: boolean;
  origin: OptionalString;
  firebase: FirebasePublicConfig;
}>;

function readOptionalEnv(value: unknown): OptionalString {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const runtimeConfig: RuntimeConfig = Object.freeze({
  isDev: Boolean(import.meta.env.DEV),
  origin:
    typeof window !== "undefined" && typeof window.location?.origin === "string"
      ? window.location.origin
      : null,
  firebase: Object.freeze({
    apiKey: readOptionalEnv(import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: readOptionalEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: readOptionalEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: readOptionalEnv(
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    ),
    messagingSenderId: readOptionalEnv(
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    ),
    appId: readOptionalEnv(import.meta.env.VITE_FIREBASE_APP_ID),
    measurementId: readOptionalEnv(
      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    ),
  }),
});

export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig;
}

export function getFirebasePublicConfig(): FirebasePublicConfig {
  return runtimeConfig.firebase;
}
