# Firebase Resume Interest Setup (Spark Tier)

This setup records resume interest email + timestamp + user agent directly into Firestore and keeps Firebase Analytics events on the frontend.

## 1) One-time prerequisites

From website root:

```bash
npx firebase login
```

## 2) Create/select Firebase project

1. Go to Firebase Console.
2. Create a project (or select existing).
3. Enable Firestore Database (Native mode).
4. Enable Google Analytics for the project (recommended for event visibility).

## 3) Register web app and copy env values

1. In Firebase Console -> Project Settings -> General -> Your apps -> Add Web app.
2. Copy config values into local env file:
   cp .env.firebase.example .env.local
3. Fill all `VITE_FIREBASE_*` values.

## 4) Deploy Firestore security rules

From website root:

```bash
npx firebase use <your-project-id>
npx firebase deploy --only firestore:rules
```

## 5) Run and verify locally

From website root:

```bash
npm run dev
```

Open `/resume`, use **Share Interest Email**, and submit a test email.

## 6) Verify data landing

1. Firestore collection: `resume_interest`
2. Fields written:
   - `email`
   - `source`
   - `userAgent`
   - `createdAt`

## 7) Analytics events from frontend

The client logs these GA/Firebase Analytics events when configured:

- `resume_page_view`
- `resume_open_click`
- `resume_interest_submit`
- `resume_interest_submit_failed`

## Notes

- No route gate is required.
- Spark-compatible mode does not collect server-side IP.
- Writes are validated by strict Firestore rules in `firestore.rules`.
- Add a brief privacy notice on the resume page if collecting personal data.
