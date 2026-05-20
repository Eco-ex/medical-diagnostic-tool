# Clinical Decision Support Tool

A web-based tool that helps healthcare professionals analyze treatment options with AI assistance. Open the app and start working — no accounts, no login. Each user supplies their own OpenAI API key from Admin Settings; the key lives only in the browser tab and is forwarded per request.

Built as a single [Next.js](https://nextjs.org/) app: the UI and the API run in one process, on one port.

## 🎯 Features

- **No login required** — open the app and start using it.
- **In-memory patient data** — patients, vitals, records, treatments, outcomes, and chat history are kept in a server-side `Map`. Restarting the server wipes everything.
- **Patient management** — add, edit, search, and delete patients.
- **Medical records, treatments, outcomes, vitals, and per-patient summaries.**
- **AI treatment analysis** — uses OpenAI chat completions. The user's key is sent per-request via the `X-OpenAI-Key` header and is never persisted server-side.
- **Per-patient chat history.**
- **Dark mode** — theme toggle in the header.
- **Responsive design** — works on desktop, tablet, and mobile.

## 🏗️ Architecture

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
- **UI**: TailwindCSS, hand-rolled UI primitives, TanStack Query for data fetching.
- **API**: Next.js Route Handlers under [app/api/](app/api/) — same-origin, so no CORS.
- **Storage**: In-memory `Map` only, isolated in [lib/server/database.ts](lib/server/database.ts). No database, no JSON files. Data is lost on restart.
- **AI**: OpenAI Chat Completions. Key is supplied per-request via the `X-OpenAI-Key` header.
- **Tests**: Vitest.

> **Deployment model:** because the patient store lives in process memory, the app must run as a **single long-lived Node process** (`next dev` or `next start`). It is not suitable for per-request serverless until the store is backed by a real database — see [Data Persistence](#-data-persistence).

## 📋 Prerequisites

- Node.js 20.9 or higher (developed on Node 22)
- npm
- An OpenAI API key (only needed if you use the AI treatment analysis)

## 🚀 Quick Start

### Development

```bash
npm install
npm run dev
```

The app runs on http://localhost:3000 — UI and API together.

### Docker

```bash
docker-compose up -d --build
```

Open http://localhost:3000.

## 🔧 Configuration

All environment variables are optional; the app runs with sensible defaults. Copy [.env.example](.env.example) to `.env.local` only if you need to override something.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL for API calls. Unset → same-origin `/api` routes (the default). Set it only to point the UI at a different host. |

## 🔑 OpenAI API Key

The server never stores the OpenAI API key. To use the AI treatment analysis:

1. Open the app and click **Admin Settings** in the header.
2. Paste your OpenAI key (starts with `sk-`) and click **Save key**.
3. The key is saved in the current tab's `sessionStorage` and is sent only when you trigger an AI analysis, via the `X-OpenAI-Key` request header.
4. Closing the tab clears the key. Each user/device sets their own.

Generate a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). It needs access to chat completions and an active billing plan.

## 🗄️ Data Persistence

**Patient data is held in memory only.** It is wiped on every server restart. This is intentional for the current scope.

[lib/server/database.ts](lib/server/database.ts) is the single seam for persistence — every other module talks to patients only through its async functions. Swapping the in-memory `Map` for **Supabase Postgres** means reimplementing that one file; the function signatures are already async, so no callers change.

## 🔒 Security Notes

- UI and API are same-origin, so there is no CORS surface.
- Security headers (CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`) are set in [next.config.mjs](next.config.mjs).
- API keys are never stored server-side; the client provides them per-request and the server only uses them to forward to OpenAI.
- `X-OpenAI-Key` is shape-validated by [lib/server/openai-key.ts](lib/server/openai-key.ts) before being forwarded.
- `/api/patients/[id]/analyze-treatment` is rate-limited per IP (10 req/min) to prevent the backend being used as an open proxy to OpenAI.
- **Known CSP relaxation:** `script-src` allows `'unsafe-inline'` because Next.js injects inline bootstrap scripts. The previous Vite build used a strict `script-src 'self'`. See the comment in [next.config.mjs](next.config.mjs) for the nonce-based remediation.

## 📁 Project Structure

```
medical-diagnostic-tool/
├── app/
│   ├── layout.tsx           # Root layout: app shell + global Header
│   ├── providers.tsx        # Client providers (Query, theme, toaster)
│   ├── (dashboard)/         # Route group: patient sidebar layout
│   │   ├── layout.tsx       # Adds the PatientList sidebar
│   │   ├── page.tsx         # "/" — empty state
│   │   └── patients/[patientId]/page.tsx  # "/patients/:id" — dashboard
│   ├── admin/page.tsx       # "/admin" — settings (no sidebar)
│   ├── globals.css
│   └── api/                 # Route Handlers (the backend)
│       ├── health/
│       └── patients/...
├── components/              # UI components + ui/ primitives
├── hooks/useQueries.ts      # TanStack Query hooks
├── lib/
│   ├── api.ts               # Client-side API wrapper
│   ├── utils.ts
│   └── server/              # Server-only modules
│       ├── database.ts      # In-memory store (the persistence seam)
│       ├── openai.ts        # OpenAI integration
│       ├── openai-key.ts    # X-OpenAI-Key validation
│       └── rate-limit.ts
├── types.ts                 # Shared types
├── next.config.mjs
└── Dockerfile
```

## 🔌 API Endpoints

### Health

- `GET /api/health` — health check

### Patients

- `GET /api/patients` — list patients
- `POST /api/patients` — add a patient
- `GET /api/patients/[id]` — get a patient
- `PUT /api/patients/[id]` — update a patient
- `DELETE /api/patients/[id]` — delete a patient
- `GET /api/patients/search/[term]` — search patients by name or id

### Patient Data

- `PUT /api/patients/[id]/vitals` — update vitals
- `POST /api/patients/[id]/medical-records`, `PUT|DELETE .../[recordId]` — manage medical records
- `POST /api/patients/[id]/treatments`, `PUT|DELETE .../[treatmentId]` — manage treatments (deleting a treatment also deletes its outcomes)
- `POST /api/patients/[id]/outcomes`, `PUT|DELETE .../[outcomeId]` — manage outcomes
- `GET|PUT /api/patients/[id]/summary` — view/update reason for visit and patient report

### AI & Chat

- `POST /api/patients/[id]/analyze-treatment` — analyze treatment (requires `X-OpenAI-Key` header)
- `GET /api/patients/[id]/chat` — get chat history
- `POST /api/patients/[id]/chat` — append a chat message
- `DELETE /api/patients/[id]/chat` — clear chat history

## 🧪 Testing

```bash
npm test           # one-shot
npm run test:watch # watch mode
npm run lint       # ESLint
```

## 📦 Production Deployment

```bash
npm install
npm run build
npm start
```

`next build` emits a standalone server build that the [Dockerfile](Dockerfile) packages into a single image. See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

Patient data lives in the server process's memory and resets on restart.

## 🐛 Troubleshooting

### App won't start
- Check that port 3000 is available.
- Ensure Node.js version is 20.9 or higher.

### OpenAI integration not working
- Open Admin Settings and confirm a key is saved for this tab.
- The key is per-tab — opening a new tab requires re-entering it.
- Confirm the key starts with `sk-` and has chat-completion permission.

## 📝 License

MIT.
