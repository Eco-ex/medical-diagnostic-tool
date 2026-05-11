# Deployment Guide

This guide covers deploying the Clinical Decision Support Tool to various platforms.

## Table of Contents

- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [VPS Deployment](#vps-deployment)
- [Cloud Platforms](#cloud-platforms)
- [Production Checklist](#production-checklist)

## Environment Setup

Before deploying, ensure you have:

1. **Secure JWT Secret**: Generate a strong secret (min 32 characters)
2. **OpenAI API Key**: Get from https://platform.openai.com/api-keys
3. **Domain Name**: For production deployments (optional but recommended)
4. **SSL Certificate**: For HTTPS (Let's Encrypt recommended)

## Docker Deployment

### Quick Deploy

1. Clone or copy the project to your server
2. Create `.env` file:

```bash
cp .env.example .env
```

3. Edit `.env`:

```env
JWT_SECRET=your-super-long-random-jwt-secret-minimum-32-characters
OPENAI_API_KEY=sk-your-openai-key-here
```

4. Start services:

```bash
docker-compose up -d
```

5. Access at `http://your-server-ip:5173`

### Custom Port Configuration

Edit `docker-compose.yml` to change ports:

```yaml
services:
  frontend:
    ports:
      - "80:80"  # Change left side to your desired port
  backend:
    ports:
      - "3001:3001"  # Change left side to your desired port
```

## VPS Deployment (Ubuntu/Debian)

### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Backend Deployment

```bash
cd /var/www/clinical-support
cd backend

# Install dependencies
npm ci --production

# Build
npm run build

# Create .env
nano .env
# Add your environment variables

# Start with PM2
pm2 start dist/server.js --name "clinical-backend"
pm2 save
pm2 startup
```

### Frontend Deployment

```bash
cd /var/www/clinical-support/frontend

# Install dependencies
npm ci

# Build for production
npm run build

# The dist/ folder is your static files
```

### Nginx Configuration

Create `/etc/nginx/sites-available/clinical-support`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/clinical-support/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/clinical-support /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com
```

## Cloud Platforms

### Heroku

#### Backend

Create `Procfile` in `backend/`:
```
web: node dist/server.js
```

Deploy:
```bash
cd backend
heroku create your-app-backend
heroku config:set JWT_SECRET=your-secret
heroku config:set NODE_ENV=production
git subtree push --prefix backend heroku main
```

#### Frontend

Deploy to Vercel or Netlify (easier for static sites)

### Vercel (Frontend)

```bash
cd frontend
npm install -g vercel
vercel
```

Configure environment variable:
- `VITE_API_URL`: Your backend URL

### Railway

1. Create new project
2. Add backend service from GitHub
3. Add frontend service from GitHub
4. Set environment variables
5. Deploy

### DigitalOcean App Platform

1. Create new app from GitHub
2. Configure two services:
   - Backend: Node.js service from `backend/`
   - Frontend: Static site from `frontend/`
3. Set environment variables
4. Deploy

## Production Checklist

### Security

- [ ] Change default JWT_SECRET to a strong random value
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly in backend
- [ ] Set up firewall (UFW/iptables)
- [ ] Enable rate limiting on API endpoints
- [ ] Regular security updates
- [ ] Backup encryption keys

### Performance

- [ ] Enable gzip compression
- [ ] Configure CDN for static assets (Cloudflare)
- [ ] Set up database instead of JSON files (PostgreSQL/MongoDB)
- [ ] Enable Redis for session storage
- [ ] Configure load balancer for high traffic
- [ ] Set up monitoring (PM2, New Relic, Datadog)

### Monitoring

- [ ] Set up error tracking (Sentry)
- [ ] Configure logging (Winston, Pino)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure alerts for critical errors
- [ ] Monitor disk space for data directory
- [ ] Track API response times

### Backup

- [ ] Automated daily backups of data/ directory
- [ ] Off-site backup storage
- [ ] Test backup restoration procedure
- [ ] Document recovery procedures
- [ ] Backup environment variables

### Database Migration (Recommended for Production)

Replace JSON storage with PostgreSQL:

1. Install PostgreSQL:
```bash
sudo apt install postgresql postgresql-contrib
```

2. Create database:
```bash
sudo -u postgres createdb clinical_support
```

3. Update `backend/src/services/database.ts` to use Prisma or Sequelize

4. Migrate existing JSON data to database

### Environment Variables for Production

```env
# Backend (.env)
NODE_ENV=production
PORT=3001
JWT_SECRET=super-secure-random-secret-min-32-chars
OPENAI_API_KEY=sk-your-key
DATABASE_URL=postgresql://user:pass@localhost:5432/clinical_support
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info

# Frontend (.env)
VITE_API_URL=https://api.your-domain.com
```

## Monitoring and Maintenance

### Check Logs

```bash
# PM2 logs
pm2 logs clinical-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker logs
docker-compose logs -f
```

### Update Application

```bash
# Pull latest code
git pull

# Backend
cd backend
npm install
npm run build
pm2 restart clinical-backend

# Frontend
cd frontend
npm install
npm run build
# Copy dist/ to nginx folder or restart docker
```

### Database Backup (if using PostgreSQL)

```bash
# Backup
pg_dump clinical_support > backup_$(date +%Y%m%d).sql

# Restore
psql clinical_support < backup_20250127.sql
```

## Troubleshooting

### Application Won't Start

1. Check logs: `pm2 logs` or `docker-compose logs`
2. Verify environment variables
3. Check port availability
4. Verify file permissions

### Database Connection Issues

1. Check DATABASE_URL format
2. Verify database is running
3. Check firewall rules
4. Verify credentials

### API Errors

1. Check backend logs
2. Verify CORS settings
3. Check JWT_SECRET matches
4. Verify API URL in frontend

---

For more help, refer to the main [README.md](README.md) or create an issue on GitHub.


