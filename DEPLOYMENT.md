# Deployment Guide

The Medical Diagnostic Tool is a single Next.js app — UI and API in one process, on one port.

## Data storage

Patient data and the AI audit log are stored in **Supabase Postgres**
([lib/server/database.ts](lib/server/database.ts) is the persistence layer; see
[SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md) for the schema and setup). The
server holds no patient state in memory, which means:

1. **Run any number of processes.** `next start`, the Docker image, multiple
   replicas behind a load balancer, or per-request **serverless** platforms
   (Vercel functions, AWS Lambda) all work.
2. **Restarts are safe.** Data lives in Postgres, not process memory.

The server needs `SUPABASE_URL` and `SUPABASE_SECRET_KEY` set — see
[Environment Variables](#environment-variables).

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

See [.env.example](.env.example).

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_SECRET_KEY` | Yes | Supabase secret key (`sb_secret_...`). Server-only — never expose it to the browser. |
| `NEXT_PUBLIC_API_URL` | No | Override the API base URL. Unset → same-origin `/api`. |
| `PORT` | No | Port for `next start` / the Docker server. Default `3000`. |

## Production Checklist

- [ ] Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, and apply the schema migration (see [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md)).
- [ ] Enable HTTPS/SSL (Certbot, or a managed load balancer).
- [ ] Put a reverse proxy in front so `X-Forwarded-For` is set (needed by the rate limiter).
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
