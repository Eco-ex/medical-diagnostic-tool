# Medical Diagnostic Tool

A web-based tool that helps healthcare professionals manage patients and analyze treatment options with AI assistance. Open the app and start working — no accounts, no login. Each user supplies their own Anthropic API key from Admin Settings; the key lives only in the browser tab and is forwarded per request.

Built as a single [Next.js](https://nextjs.org/) app — the UI and the API run in one process, on one port — backed by **Supabase** (Postgres for data, Edge Functions for the knowledge pipeline).

## 🎯 Features

- **No login required** — open the app and start using it.
- **Persistent patient data** — patients, vitals, records, treatments, outcomes, and chat history are stored in Supabase Postgres and survive restarts.
- **Patient management** — add, edit, search, and delete patients.
- **Medical records, treatments, outcomes, vitals, and per-patient summaries.**
- **AI treatment analysis** — uses Anthropic's Messages API (Claude). The user's key is sent per-request via the `X-Anthropic-Key` header and is never persisted server-side.
- **AI audit log** — every analysis call (success or failure) is recorded to `ai_interactions` with the full prompt, response, token usage, and latency.
- **Per-patient chat history** — modeled as conversations so history can be cleared without losing the AI audit trail.
- **Knowledge ingestion pipeline** *(in development)* — a Supabase Edge Function + pgvector pipeline that turns medical PDFs into embedded, searchable chunks for retrieval-augmented analysis. See [Knowledge Ingestion Pipeline](#-knowledge-ingestion-pipeline-in-development).
- **Dark mode** — theme toggle in the header.
- **Responsive design** — works on desktop, tablet, and mobile.

## 🗺️ Roadmap

High-level view of what's planned next.

**Finishing the ingestion pipeline**
- **Phases 4b–4d** — chunking, embedding, and finalization Edge Functions
- **Phase 5** — Next.js route for uploading PDFs into the pipeline
- **Phase 6** — end-to-end smoke test of the full pipeline

**Beyond v1 ingestion**
- **Phase 7** — admin knowledge UI (upload, document status, search-quality sandbox)
- **Phase 8** — retrieval-grounded (RAG) treatment analysis, replacing the current ungrounded version
- **Phase 9** — multi-agent orchestrator (router + specialist agents + synthesizer)
- **Phase 10** — flowchart visualization of the orchestration process
- **Phase 11** — clinician feedback capture on AI outputs
- **Phase 12** — learned re-ranker trained on accumulated feedback data

## 🏗️ Architecture

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
- **UI**: TailwindCSS, hand-rolled UI primitives, TanStack Query for data fetching.
- **API**: Next.js Route Handlers under [app/api/](app/api/) — same-origin, so no CORS.
- **Storage**: Supabase Postgres, accessed only through [lib/server/database.ts](lib/server/database.ts) (the persistence seam). The server holds no patient state in memory.
- **AI**: Anthropic Messages API (Claude). The model and prompt live in [lib/server/anthropic.ts](lib/server/anthropic.ts); the user's key is supplied per-request via the `X-Anthropic-Key` header.
- **Knowledge pipeline**: Supabase Edge Functions (Deno) under [supabase/functions/](supabase/functions/) + pgvector, using LlamaParse for parsing and Voyage AI for embeddings.
- **Tests**: Vitest (app code); `deno test` for the Edge Functions' pure logic.

> **Deployment model:** because all state lives in Postgres, the app is stateless and can run as multiple replicas behind a load balancer or on per-request serverless platforms. See [DEPLOYMENT.md](DEPLOYMENT.md).

## 📋 Prerequisites

- Node.js 20.9 or higher (developed on Node 22)
- npm
- A **Supabase project** (Postgres) — required for the app to run
- An **Anthropic API key** — optional; only needed to use AI treatment analysis (entered in-app, not via env)
- *For the knowledge ingestion pipeline only:* the [Supabase CLI](https://supabase.com/docs/guides/cli) (bundles Deno 2), a [LlamaCloud](https://cloud.llamaindex.ai/) API key, and a [Voyage AI](https://voyageai.com/) API key

## 🚀 Quick Start

### Development

```bash
npm install
```

Create `.env.local` with your Supabase credentials (copy from [.env.example](.env.example)):

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SECRET_KEY=<your-supabase-secret-key>
```

Apply the database schema — the migrations live in [supabase/migrations/](supabase/migrations/). With the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Then start the app:

```bash
npm run dev
```

The app runs on http://localhost:3000 — UI and API together. There is no separate backend to start.

### Docker

```bash
docker-compose up -d --build
```

Open http://localhost:3000. (The container still needs `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in its environment.)

## 🔧 Configuration

Copy [.env.example](.env.example) to `.env.local`. The Supabase variables are required; the rest are optional.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SECRET_KEY` | Yes | Supabase secret key (`sb_secret_...`). Bypasses Row Level Security, so keep it **server-only** — never expose it to the browser. |
| `NEXT_PUBLIC_API_URL` | No | Base URL for API calls. Unset → same-origin `/api` routes (the default). Set it only to point the UI at a different host. |
| `PORT` | No | Port for `next start` / the Docker server. Default `3000`. |

### Edge Function secrets (knowledge pipeline only)

The Edge Functions read their secrets from the Supabase platform, not from `.env.local`. Set them with `supabase secrets set` (or in the dashboard); see [supabase/functions/.env.example](supabase/functions/.env.example).

| Variable | Purpose |
| --- | --- |
| `LLAMA_CLOUD_API_KEY` | LlamaParse — PDF → markdown (`parse-document`). |
| `VOYAGE_API_KEY` | Voyage AI — chunk embeddings (`embed-batch`). |

## 🔑 Anthropic API Key

The server never stores the Anthropic API key. To use the AI treatment analysis:

1. Open the app and click **Admin Settings** in the header.
2. Paste your Anthropic key (starts with `sk-ant-`) and click **Save key**.
3. The key is saved in the current tab's `sessionStorage` and is sent only when you trigger an AI analysis, via the `X-Anthropic-Key` request header.
4. Closing the tab clears the key. Each user/device sets their own.

Generate a key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys). It needs access to the Messages API and an active billing plan.

## 🗄️ Data Persistence

**Patient data and the AI audit log are stored in Supabase Postgres** and persist across restarts.

[lib/server/database.ts](lib/server/database.ts) is the single seam for persistence — every API route talks to patient data only through its async functions. Routes pass the human-facing patient id (the MRN); this layer resolves it to the internal UUID and maps DB rows to the wire types in [types/](types/). The server-only Supabase client ([lib/server/supabase.ts](lib/server/supabase.ts)) uses the secret key and therefore bypasses RLS — the trusted Next.js API route is the security boundary.

Core tables: `patients`, `vitals`, `medical_records`, `treatments`, `outcomes`, `conversations`, `chat_messages`, and `ai_interactions` (the AI audit log). The knowledge pipeline adds `documents`, `ingestion_jobs`, `chunks`, and `chunk_embeddings`.

## 📚 Knowledge Ingestion Pipeline (in development)

A retrieval-augmented-generation (RAG) knowledge base is being built on Supabase Edge Functions (Deno) + pgvector. It turns uploaded medical PDFs into embedded, searchable chunks:

1. **`parse-document`** — PDF → markdown via LlamaParse, saved to Storage.
2. **`chunk-document`** — section-aware chunking (heading hierarchy, atomic tables/code/lists) sized with `js-tiktoken`.
3. **`embed-batch`** — chunk text → 1024-dim Voyage (`voyage-4-large`) vectors, upserted into `chunk_embeddings`.
4. **`finalize-document`** — flips a document to `indexed` once all chunks are embedded.

Retrieval is exposed via the `match_chunks()` Postgres function (HNSW cosine index over `chunk_embeddings`).

**Status:** `parse-document`, `chunk-document`, and `embed-batch` are implemented; `finalize-document`, the browser upload route, the admin knowledge UI, and retrieval-grounded analysis are still in progress. **This subsystem is not user-facing yet** — the patient-management app above works without it.

## 🔒 Security Notes

- UI and API are same-origin, so there is no CORS surface.
- Security headers (CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`) are set in [next.config.mjs](next.config.mjs).
- The Supabase **secret key is server-only** and bypasses RLS; it is never sent to the browser.
- Anthropic API keys are never stored server-side; the client provides them per-request and the server only uses them to forward to Anthropic. `X-Anthropic-Key` is shape-validated by [lib/server/anthropic-key.ts](lib/server/anthropic-key.ts) before being forwarded, and only the last 4 characters are recorded (in the audit log).
- `/api/patients/[id]/analyze-treatment` is rate-limited per IP (10 req/min) to prevent the backend being used as an open proxy to Anthropic.
- **Known CSP relaxation:** `script-src` allows `'unsafe-inline'` because Next.js injects inline bootstrap scripts. See the comment in [next.config.mjs](next.config.mjs) for the nonce-based remediation.

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
│   └── api/                 # Route Handlers (the web backend)
│       ├── health/
│       └── patients/...
├── components/
│   ├── patient/             # Patient dashboard, list, panels, modals
│   ├── knowledge/           # Admin knowledge-ingestion UI
│   └── ui/                  # Design-system primitives
├── hooks/useQueries.ts      # TanStack Query hooks
├── lib/
│   ├── api.ts               # Client-side API wrapper
│   ├── utils.ts
│   └── server/              # Server-only modules
│       ├── supabase.ts      # Supabase client (secret key, bypasses RLS)
│       ├── database.ts      # Persistence layer (Postgres) — the seam
│       ├── ai-interactions.ts # AI audit-log writer (ai_interactions)
│       ├── anthropic.ts     # Anthropic Messages API client
│       ├── anthropic-key.ts # X-Anthropic-Key validation
│       └── rate-limit.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/          # SQL schema (patient tables + pgvector)
│   └── functions/           # Deno Edge Functions
│       ├── _shared/         # supabase / db / llama / voyage clients
│       ├── parse-document/  # PDF → markdown (LlamaParse)
│       ├── chunk-document/  # markdown → chunks (js-tiktoken)
│       ├── embed-batch/     # chunks → Voyage embeddings
│       └── finalize-document/
├── types/                   # Shared types (patient, api, knowledge)
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

- `PUT /api/patients/[id]/vitals` — append a vitals reading (current = most recent)
- `POST /api/patients/[id]/medical-records`, `PUT|DELETE .../[recordId]` — manage medical records
- `POST /api/patients/[id]/treatments`, `PUT|DELETE .../[treatmentId]` — manage treatments (deleting a treatment cascade-deletes its outcomes)
- `POST /api/patients/[id]/outcomes`, `PUT|DELETE .../[outcomeId]` — manage outcomes
- `GET|PUT /api/patients/[id]/summary` — view/update reason for visit and patient report

### AI & Chat

- `POST /api/patients/[id]/analyze-treatment` — analyze treatment (requires `X-Anthropic-Key` header; recorded to `ai_interactions`)
- `GET /api/patients/[id]/chat` — get chat history
- `POST /api/patients/[id]/chat` — append a chat message
- `DELETE /api/patients/[id]/chat` — clear chat history

## 🧪 Testing

```bash
npm test           # one-shot (Vitest)
npm run test:watch # watch mode
npm run lint       # ESLint
```

The Edge Functions' pure logic has its own tests run with Deno, e.g.:

```bash
deno test --no-check --allow-read --allow-net --allow-env \
  --config supabase/functions/chunk-document/deno.json \
  supabase/functions/chunk-document/chunk.test.ts
```

## 📦 Production Deployment

```bash
npm install
npm run build
npm start
```

`next build` emits a standalone server build that the [Dockerfile](Dockerfile) packages into a single image. The app is stateless (all data is in Postgres), so it can scale horizontally. See [DEPLOYMENT.md](DEPLOYMENT.md) for details, and apply the schema from [supabase/migrations/](supabase/migrations/) before first run.

## 🐛 Troubleshooting

### App won't start
- Check that port 3000 is available.
- Ensure Node.js version is 20.9 or higher.
- Confirm `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set — the server throws on startup if either is missing.

### Database errors
- Verify the schema has been applied (`supabase db push`, or run the SQL in [supabase/migrations/](supabase/migrations/)).
- Confirm the secret key is the `sb_secret_...` key, not the publishable/anon key.

### Anthropic integration not working
- Open Admin Settings and confirm a key is saved for this tab.
- The key is per-tab — opening a new tab requires re-entering it.
- Confirm the key starts with `sk-ant-` and has Messages API permission.

## 📝 License

MIT.
