# MindMate

MindMate is a private-first journaling and self-reflection demo. It offers mood check-ins, personal journal notes, simple summaries of self-reported data, and optional AI-generated reflection. It is not a medical app, therapist, diagnostic tool, or emergency service.

## Run locally

Requirements: Node.js 20+ and npm. For AI reflection, install [Ollama](https://ollama.com/download) or use another OpenAI-compatible chat-completions endpoint.

```powershell
npm install
Copy-Item .env.example .env
Copy-Item server/.env.example server/.env
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). In a second terminal, start the API:

```powershell
npm run server
```

Without Firebase configuration, the app runs in **local demo mode**. Entries are stored in this browser's local storage. The sample entries are clearly included as demo content; this mode is not private from other people who use the same OS account/browser profile and is not suitable for real sensitive records.

## Local language model

Install Ollama, then download a small model (the 3B model is a reasonable laptop starting point; storage and RAM needs vary):

```powershell
ollama pull llama3.2:3b
ollama serve
```

Keep the Ollama process running. The backend template points to its OpenAI-compatible endpoint. Set `LLM_BASE_URL`, `LLM_MODEL`, and, if required by your provider, `LLM_API_KEY` in `server/.env`. Ollama commonly needs no API key. Never put an AI key in a `VITE_` variable or browser code.

AI is optional. In a journal entry, tick the consent checkbox before pressing **Reflect**. Only the entry text needed for that request is sent. The endpoint does not log prompts or model responses. A local keyword safety check runs before the external model call; it is not a risk assessment and can miss or misread context. For immediate danger, contact local emergency services or a trusted person. In the U.S. and Canada, call or text 988.

## Firebase setup

1. Create a Firebase project and register a web app.
2. Enable Email/Password in Authentication and create a Firestore database.
3. Copy `.env.example` to `.env` and set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` from Firebase web app settings.
4. Publish `firestore.rules` to Firestore. These rules restrict records to the signed-in UID.
5. For production API authentication, configure Firebase Admin credentials server-side using `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON text) or `GOOGLE_APPLICATION_CREDENTIALS` (path on the server). Never commit service account credentials.

The app supports Firebase email/password sign-up, login, password reset, journal/mood storage, and per-record deletion. Demo starter entries are local examples and are not uploaded to Firebase.

## API

`POST /api/reflect` requires `{ "journalEntry": "...", "consent": true }`, limits input to 5,000 characters, is rate-limited, and returns a schema-validated `reflection` object. Production requests require a Firebase ID token in `Authorization: Bearer ...`. Local development allows same-device-origin requests when Firebase Admin is not configured. `GET /api/health` reports whether AI and Firebase Admin are configured.

The API applies request limits and timeouts and avoids recording journal content in logs. The safety phrase matcher is an additional conservative pathway, not a substitute for clinical risk screening or human support. Before deployment, run the tests and conduct a broader safety review including false-positive/false-negative cases.

## Commands

```powershell
npm run dev       # frontend
npm run server    # API
npm run build     # production frontend build
npm test          # API and safety tests
```

## Deployment notes

Deploy the static frontend to Vercel or Firebase Hosting and deploy `server/` as a Node service (for example Render). Set `CLIENT_ORIGIN` to the exact HTTPS frontend origin and set `NODE_ENV=production` on the API. Configure Firebase web settings as frontend environment variables and Firebase Admin/LLM credentials only as backend secrets. Set the frontend's `VITE_API_URL` to the deployed API base path. Use HTTPS, restrictive Firebase rules, access-controlled provider credentials, and tested backup/deletion procedures.

## Data and limitations

- Local demo records live in browser local storage and can be removed from Settings. They are not encrypted by MindMate and may be included in browser/device backups.
- Firebase records are associated with the authenticated UID and protected by the included Firestore rules. Deleting all entries removes the app's journal and mood documents; deleting a Firebase Auth account and any remaining user metadata must also be handled in the Firebase console or a trusted account-deletion backend before production use.
- Export downloads journal and mood data as JSON. It does not include Firebase account credentials.
- Mood charts only visualize what the user logged. They do not imply causation or diagnose a condition.
- This project is a college demonstration baseline, not a security or clinical certification. Review privacy, retention, legal, accessibility, and crisis-resource obligations for the deployment region before collecting real sensitive data.
