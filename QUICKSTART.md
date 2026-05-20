# Quick Start Guide

## Prerequisites

- Node.js 20.9+ (developed on Node 22)
- npm
- A code editor (VS Code recommended)

## 🚀 Getting Started (2 minutes)

```bash
npm install
npm run dev
```

Open http://localhost:3000. The UI and the API run together in one process — there is no separate backend to start.

## Configure OpenAI (optional)

The AI treatment analysis needs an OpenAI API key:

1. Click **Admin Settings** in the header.
2. Paste your key (starts with `sk-`) and click **Save key**.
3. The key is stored only in this browser tab's session storage and is sent per-request to OpenAI. Closing the tab clears it.

Get a key at https://platform.openai.com/api-keys — it needs chat-completion access and an active billing plan.

## What's Available

- 👥 **Patient Management** — add, edit, search, and delete patient records
- 📋 **Medical Records** — track patient history and conditions
- 💊 **Treatments & Outcomes** — document treatments and their results
- 📊 **Vitals Tracking** — monitor patient vital signs
- 📝 **Summary** — reason for visit and patient report
- 🤖 **AI Analysis** — evidence-based treatment insights (requires an OpenAI key)
- 🌙 **Dark Mode** — toggle in the header

> Patient data is held in memory and is wiped whenever the server restarts.

## Common Commands

```bash
npm run dev          # start the dev server (http://localhost:3000)
npm run build        # production build
npm start            # run the production build
npm test             # run the test suite
npm run lint         # run ESLint
```

## Troubleshooting

### Port 3000 already in use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Dependencies won't install

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 🐳 Using Docker

```bash
docker-compose up -d --build
```

Access at http://localhost:3000. Stop with `docker-compose down`.

## Next Steps

- Read [README.md](README.md) for full documentation
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
