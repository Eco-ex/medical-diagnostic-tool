# Deployment Guide

The Clinical Decision Support Tool is a single Next.js app — UI and API in one process, on one port.

## Important: Stateful, single-process

Patient data lives in the server process's memory ([lib/server/database.ts](lib/server/database.ts)). This has two consequences for deployment:

1. **Run exactly one long-lived process.** `next start` (or the Docker image) is fine. Per-request **serverless** platforms (Vercel functions, AWS Lambda) are **not** — each invocation gets fresh memory, so the store would reset constantly.
2. **A restart wipes all data.** This is expected for the current scope.

To remove these constraints, back the store with **Supabase Postgres** by reimplementing [lib/server/database.ts](lib/server/database.ts). Its functions are already async, so nothing else changes.

## Docker (recommended)

```bash
docker-compose up -d --build
```

This builds the [Dockerfile](Dockerfile) (Next.js standalone output) and serves the app on port 3000. Access at `http://your-server-ip:3000`.

To change the published port, edit [docker-compose.yml](docker-compose.yml):

```yaml
services:
  app:
    ports:
      - "80:3000"   # host:container
```

## Manual (VPS)

```bash
# Install Node.js 20+ and clone the repo, then:
npm ci
npm run build
npm start            # serves on port 3000 (override with PORT)
```

Keep the process alive with a process manager:

```bash
npm install -g pm2
pm2 start npm --name clinical-support -- start
pm2 save && pm2 startup
```

### Reverse proxy (Nginx)

Put Nginx in front for TLS and so the per-IP rate limiter sees a real client IP
via `X-Forwarded-For`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add TLS with Certbot:

```bash
sudo certbot --nginx -d your-domain.com
```

## Environment Variables

All are optional (see [.env.example](.env.example)):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Override the API base URL. Unset → same-origin `/api`. |
| `PORT` | Port for `next start` / the Docker server. Default `3000`. |

## Production Checklist

- [ ] Run as a single process (`next start` / one container) — not serverless.
- [ ] Enable HTTPS/SSL (Certbot, or a managed load balancer).
- [ ] Put a reverse proxy in front so `X-Forwarded-For` is set (needed by the rate limiter).
- [ ] Plan for data loss on restart, or migrate the store to Supabase Postgres.
- [ ] Review the CSP note in [next.config.mjs](next.config.mjs) before exposing publicly.
- [ ] Set up uptime and error monitoring.

## Updating

```bash
git pull
npm ci
npm run build
pm2 restart clinical-support     # or: docker-compose up -d --build
```

---

For more, see [README.md](README.md).
