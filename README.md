# Clinical Decision Support Tool

A web-based clinical decision support tool that helps healthcare professionals analyze treatment options using AI-powered insights. No accounts, no login — open the app and start working. Each user supplies their own OpenAI API key from Admin Settings; the key lives only in the browser tab and is forwarded per request.

## 🎯 Features

- **No Login Required**: Open the app and start using it. Patient data lives in an in-memory cache on the server.
- **Patient Management**: Add, edit, and delete patient records.
- **Medical Records**: Track patient history, vitals, and medical conditions.
- **Treatment Planning**: Document treatments and outcomes.
- **AI-Powered Analysis**: OpenAI integration. Each user supplies their own key in Admin Settings; the key never persists on the server.
- **Dark Mode**: Theme toggle in the header.
- **Responsive Design**: Works on desktop, tablet, and mobile.

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Storage**: In-memory only — patient data is held in a `Map` and is lost when the server restarts.
- **AI**: OpenAI API. The key is supplied per-request via the `X-OpenAI-Key` header.

## 📋 Prerequisites

- Node.js 20 or higher
- npm or yarn
- An OpenAI API key (only needed for treatment analysis)

## 🚀 Quick Start

### Development Mode

#### Backend Setup

```bash
cd backend-new
npm install
cp .env.example .env
npm run dev
```

The backend runs on http://localhost:3001.

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:5173.

### Docker Deployment

```bash
docker-compose up -d
```

Access the application at http://localhost:5173.

## 🔧 Configuration

### Backend Configuration (.env)

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Frontend Configuration (.env)

```env
VITE_API_URL=http://localhost:3001
```

## 🔑 OpenAI API Key

The app does not store the OpenAI API key on the server. To use AI treatment analysis:

1. Open the app and click **Admin Settings** in the header.
2. Paste your OpenAI key (starts with `sk-`).
3. The key is saved in the current tab&apos;s `sessionStorage` and is sent only when you trigger an AI analysis, via the `X-OpenAI-Key` request header.
4. Closing the tab clears the key. Each user/device sets their own.

## 🗄️ Data Persistence

**Patient data is held in memory only.** It is wiped on every server restart. This is intentional for the current scope; for persistent storage you would need to plug in a database in [backend-new/src/services/database.ts](backend-new/src/services/database.ts).

## 🔒 Security Notes

- CORS configured per environment
- Helmet.js security headers
- Input validation on patient mutations
- API keys never stored server-side; provided per-request by the client and used only to forward to OpenAI

## 🔌 API Endpoints

### Health

- `GET /health` — health check

### Patients

- `GET /api/patients` — list patients
- `GET /api/patients/:id` — get patient
- `GET /api/patients/search/:term` — search patients
- `POST /api/patients` — add patient
- `PUT /api/patients/:id` — update patient
- `DELETE /api/patients/:id` — delete patient

### Patient Data

- `PUT /api/patients/:id/vitals` — update vitals
- `POST/PUT/DELETE /api/patients/:id/medical-records[/:recordId]` — manage medical records
- `POST/PUT/DELETE /api/patients/:id/treatments[/:treatmentId]` — manage treatments
- `POST/PUT/DELETE /api/patients/:id/outcomes[/:outcomeId]` — manage outcomes
- `GET/PUT /api/patients/:id/summary` — view/update summary

### AI & Chat

- `POST /api/patients/:id/analyze-treatment` — analyze treatment (requires `X-OpenAI-Key` header)
- `GET /api/patients/:id/chat` — get chat history
- `POST /api/patients/:id/chat` — add chat message
- `DELETE /api/patients/:id/chat` — clear chat history

## 🧪 Testing

Both projects use [Vitest](https://vitest.dev/).

```bash
# Backend
cd backend-new
npm test           # one-shot
npm run test:watch # watch mode

# Frontend
cd frontend
npm test
```

Lint and format:

```bash
# Backend
cd backend-new
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
```

## 📦 Production Deployment

### Using Docker

```bash
docker-compose up -d --build
```

### Manual

```bash
# Backend
cd backend-new
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ with nginx or similar
```

## 📝 License

MIT License.

## 🐛 Troubleshooting

### Backend won't start
- Check that port 3001 is available.
- Ensure Node.js version is 20+.

### Frontend can't connect to backend
- Verify backend is running on port 3001.
- Check `VITE_API_URL` in `frontend/.env`.
- Check `CORS_ORIGIN` in the backend `.env`.

### OpenAI integration not working
- Open Admin Settings and confirm a key is saved for this tab.
- Check that the key starts with `sk-` and has chat-completion permission.
- The key is per-tab — opening a new tab requires re-entering it.
