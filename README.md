# Clinical Decision Support Tool

A web-based tool that helps healthcare professionals analyze treatment options with AI assistance. Open the app and start working — no accounts, no login. Each user supplies their own OpenAI API key from Admin Settings; the key lives only in the browser tab and is forwarded per request.

## 🎯 Features

- **No login required** — open the app and start using it.
- **In-memory patient data** — patients, vitals, records, treatments, outcomes, and chat history are kept in a server-side `Map`. Restarting the backend wipes everything.
- **Patient management** — add, edit, search, and delete patients.
- **Medical records, treatments, outcomes, vitals, and per-patient summaries.**
- **AI treatment analysis** — uses OpenAI chat completions. The user&apos;s key is sent per-request via the `X-OpenAI-Key` header and is never persisted server-side.
- **Per-patient chat history.**
- **Dark mode** — theme toggle in the header.
- **Responsive design** — works on desktop, tablet, and mobile.

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + TanStack Query
- **Backend**: Node.js + Express + TypeScript
- **Storage**: In-memory `Map` only. No database, no JSON files. Data is lost on restart.
- **AI**: OpenAI Chat Completions. Key is supplied per-request via the `X-OpenAI-Key` header.
- **Tests**: Vitest on both sides.

## 📋 Prerequisites

- Node.js 20 or higher
- npm
- An OpenAI API key (only needed if you use the AI treatment analysis)

## 🚀 Quick Start

### Development

Backend:

```bash
cd backend
npm install
npm run dev
```

The backend runs on http://localhost:3001. The defaults in [backend/src/server.ts](backend/src/server.ts) are sufficient for local development; create a `backend/.env` only if you want to override them (see Configuration below).

Frontend (in a new terminal):

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:5173.

The repo root also ships [start-dev.sh](start-dev.sh) and [start-dev.bat](start-dev.bat) helper scripts that install dependencies and start both processes. They attempt to seed `.env` files from `.env.example` templates that are not currently checked in — that step prints a "not found" error and is harmless; the apps still start.

### Docker

```bash
docker-compose up -d --build
```

Open http://localhost:5173.

## 🔧 Configuration

All `.env` files are optional. The backend and frontend both run with sensible defaults; create one only if you need to override.

### Backend (`backend/.env`)

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

These are the only variables the backend reads. There is no `JWT_SECRET`, `OPENAI_API_KEY`, or `DATA_DIR` — earlier versions used those, but the current build does not.

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3001
```

The frontend defaults to `http://localhost:3001` if no `.env` is present, so creating one is only required if you point at a different backend.

## 🔑 OpenAI API Key

The server never stores the OpenAI API key. To use the AI treatment analysis:

1. Open the app and click **Admin Settings** in the header.
2. Paste your OpenAI key (starts with `sk-`) and click **Save key**.
3. The key is saved in the current tab&apos;s `sessionStorage` and is sent only when you trigger an AI analysis, via the `X-OpenAI-Key` request header.
4. Closing the tab clears the key. Each user/device sets their own.

Generate a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). It needs access to chat completions and an active billing plan.

## 🗄️ Data Persistence

**Patient data is held in memory only.** It is wiped on every server restart. This is intentional for the current scope; for persistent storage you would plug a database into [backend/src/services/database.ts](backend/src/services/database.ts) — that file is the single source of truth for the patient store.

The repo contains a `backend/data/` directory with `patients.json`, `users.json`, `settings.json`, and `audit-logs.json`. These are leftovers from an earlier file-backed, JWT-authenticated version of the backend; the current code does not read or write them and they can be ignored.

## 🔒 Security Notes

- CORS configured per environment via `CORS_ORIGIN`.
- Helmet.js security headers on the backend; strict CSP and `X-Frame-Options`/`Referrer-Policy`/`Permissions-Policy` headers on the Nginx-served frontend.
- Input validation on patient mutations.
- API keys are never stored server-side; the client provides them per-request and the server only uses them to forward to OpenAI.
- `X-OpenAI-Key` is shape-validated and stripped from `req.headers` by middleware before any logger sees it, so request logs cannot leak the key.
- `/analyze-treatment` is rate-limited per IP (10 req/min) to prevent the backend being used as an open proxy to OpenAI.

## 📁 Project Structure

```
medical-diagnostic-tool/
├── backend/              # Express backend
│   ├── src/
│   │   ├── server.ts         # App entry
│   │   ├── routes/           # /api/patients/*
│   │   ├── services/         # database (in-memory) + openai
│   │   └── types.ts          # Shared types
│   └── Dockerfile
├── frontend/                 # React + Vite app
│   ├── src/
│   │   ├── App.tsx           # Root, no auth gate
│   │   ├── components/       # UI + AdminSettings
│   │   ├── hooks/useQueries.ts
│   │   ├── lib/api.ts        # API client + sessionStorage helpers
│   │   └── types.ts
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── start-dev.sh / start-dev.bat
└── README.md
```

## 🔌 API Endpoints

### Health

- `GET /health` — health check

### Patients

- `GET /api/patients` — list patients
- `GET /api/patients/:id` — get a patient
- `GET /api/patients/search/:term` — search patients by name or id
- `POST /api/patients` — add a patient
- `PUT /api/patients/:id` — update a patient
- `DELETE /api/patients/:id` — delete a patient

### Patient Data

- `PUT /api/patients/:id/vitals` — update vitals
- `POST/PUT/DELETE /api/patients/:id/medical-records[/:recordId]` — manage medical records
- `POST/PUT/DELETE /api/patients/:id/treatments[/:treatmentId]` — manage treatments (deleting a treatment also deletes its outcomes)
- `POST/PUT/DELETE /api/patients/:id/outcomes[/:outcomeId]` — manage outcomes
- `GET/PUT /api/patients/:id/summary` — view/update reason for visit and patient report

### AI & Chat

- `POST /api/patients/:id/analyze-treatment` — analyze treatment (requires `X-OpenAI-Key` header)
- `GET /api/patients/:id/chat` — get chat history
- `POST /api/patients/:id/chat` — append a chat message
- `DELETE /api/patients/:id/chat` — clear chat history

There are no auth, admin, or user endpoints — they were removed along with login.

## 🧪 Testing

Both projects use [Vitest](https://vitest.dev/).

```bash
# Backend
cd backend
npm test           # one-shot
npm run test:watch # watch mode

# Frontend
cd frontend
npm test
```

Lint and format:

```bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
```

## 📦 Production Deployment

### Docker

```bash
docker-compose up -d --build
```

The compose file starts a backend container on `3001` and an Nginx-served frontend on `5173` (host port `5173` → container port `80`). Patient data lives in the backend container&apos;s memory and resets when the container restarts.

Note: [docker-compose.yml](docker-compose.yml) still passes `JWT_SECRET` and `DATA_DIR` to the backend and bind-mounts `./data` into the container. These come from the previous file-backed version and are ignored by the current backend; they do not need to be set, but they have not yet been removed from the compose file.

### Manual

```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
# Serve dist/ with Nginx, Caddy, Vercel, Netlify, etc.
```

## 🐛 Troubleshooting

### Backend won&apos;t start
- Check that port 3001 is available.
- Ensure Node.js version is 20 or higher.

### Frontend can&apos;t connect to backend
- Verify the backend is running on port 3001.
- Check `VITE_API_URL` in `frontend/.env`.
- Check `CORS_ORIGIN` in `backend/.env`.

### OpenAI integration not working
- Open Admin Settings and confirm a key is saved for this tab.
- The key is per-tab — opening a new tab requires re-entering it.
- Confirm the key starts with `sk-` and has chat-completion permission.

## 📝 License

MIT.
