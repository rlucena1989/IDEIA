# Desktop Deployment Guide — IDEIA

> **Deploy IDEIA-generated applications to your local desktop environment.**
> Covers Node.js, Docker Compose, PM2, and Nginx setups.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 20+ | `node -v` |
| npm / pnpm / yarn | latest | `npm -v` / `pnpm -v` / `yarn -v` |
| Docker Desktop | latest | `docker -v` |
| Git | latest | `git --version` |
| IDEIA CLI | latest | `IDEIA --version` |

Install missing tools:
```bash
# Node.js (Windows)
winget install OpenJS.NodeJS.LTS

# Docker Desktop
winget install Docker.DockerDesktop

# IDEIA CLI
npm install -g @ideia/cli
```

---

## Quick Start

Get running in under 10 minutes:

```bash
# 1. Generate project
IDEIA generate my-app --template node-express

# 2. Enter project
cd my-app

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env
# Edit .env with your settings

# 5. Start
npm run dev
```

Your app is now running at `http://localhost:3000`.

---

## Environment Setup

### .env Configuration

```env
# Server
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
# DUCKDB_PATH=./data/db.duckdb
# SQLITE_PATH=./data/db.sqlite

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_METHODS=GET,POST,PUT,DELETE

# Logging
LOG_LEVEL=info
```

### Database Options

**DuckDB** (embedded — no Docker needed):
```bash
npm install @duckdb/node-api
# Set DUCKDB_PATH=./data/db.duckdb in .env
```

**SQLite** (embedded — no Docker needed):
```bash
npm install better-sqlite3
# Set SQLITE_PATH=./data/db.sqlite in .env
```

**PostgreSQL** (via Docker):
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

### Redis (via Docker)

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redisdata:/data \
  redis:7-alpine
```

### Port Allocation Reference

| Port | Service |
|------|---------|
| 3000 | Node.js app |
| 3001 | Next.js dev |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 6378 | Redis (fallback) |
| 8080 | Nginx reverse proxy |
| 5678 | IDEIA Agent Runtime |

### CORS Configuration

```typescript
// src/index.ts (Express example)
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(','),
  methods: process.env.CORS_METHODS?.split(','),
  credentials: true,
}));
```

---

## Build Process

### Production Build

```bash
# Standard Node.js
npm run build

# TypeScript compilation
npx tsc

# NestJS
npm run build

# Next.js
npm run build
```

Output goes to `dist/` or `.next/`.

### Docker Image Build

```bash
docker build -t my-app:latest .
```

### Multi-Stage Dockerfile

```dockerfile
# Stage 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — Production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## Local Deployment Options

### Node.js Direct

```bash
# Build first
npm run build

# Run production server
node dist/index.js

# Or with environment override
NODE_ENV=production PORT=4000 node dist/index.js
```

### Docker Compose

`docker-compose.yml`:
```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-pass}
      POSTGRES_DB: ${POSTGRES_DB:-myapp}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

Start everything:
```bash
docker-compose up -d
```

### PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# ecosystem.config.js
module.exports = {
  apps: [{
    name: "my-app",
    script: "dist/index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    max_memory_restart: "1G",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
  }]
};
```

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save process list (auto-restart on reboot)
pm2 save
pm2 startup

# Useful commands
pm2 status
pm2 logs my-app
pm2 monit
pm2 reload ecosystem.config.js
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/my-app
server {
    listen 80;
    server_name localhost;

    # Access logs
    access_log /var/log/nginx/my-app-access.log;
    error_log  /var/log/nginx/my-app-error.log;

    # Proxy to Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (for SPA)
    location /static/ {
        alias /var/www/my-app/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/my-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Verification

### Health Check

```bash
# HTTP health endpoint (if implemented)
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","uptime":12345,"timestamp":"2026-07-22T12:00:00Z"}
```

### Smoke Tests

```bash
# Basic connectivity
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200

# API endpoint
curl http://localhost:3000/api/status

# Docker containers
docker ps --filter "name=my-app" --filter "status=running"
```

### Log Inspection

```bash
# Node.js direct / PM2 logs
tail -f logs/*.log

# Docker logs
docker logs my-app
docker logs my-app --tail 100 -f

# Docker Compose
docker-compose logs -f
docker-compose logs app

# PM2
pm2 logs my-app
pm2 show my-app
```

### Port Confirmation

```bash
# Windows
netstat -ano | findstr :3000

# Linux / macOS
lsof -i :3000
ss -tlnp | grep 3000

# Docker mapping
docker port my-app 3000
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F

# Kill the process (Linux)
kill -9 $(lsof -t -i:3000)

# Or change port in .env
PORT=3001
```

### Database Connection Refused

```bash
# Check if container is running
docker ps | findstr postgres

# Check logs
docker logs postgres

# Verify connection string
echo %DATABASE_URL%

# Test connection manually
psql -h localhost -U user -d myapp
```

### Environment Variables Not Set

```bash
# Verify .env exists
if (Test-Path .\.env) { echo ".env exists" } else { echo ".env missing" }

# Load .env manually (Node.js)
node -r dotenv/config -e "console.log(process.env.PORT)"

# Check running env
docker exec my-app env | findstr PORT
```

### Build Failures

```bash
# Clear caches
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# TypeScript errors
npx tsc --noEmit

# Check Node.js version
node -v  # Must be 20+

# Disk space
# Windows: wmic logicaldisk get size,freespace,caption
# Linux: df -h
```

### Docker Daemon Not Running

```bash
# Check Docker status
docker info

# Start Docker Desktop
# Windows: Start menu → Docker Desktop
# Or command line:
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Verify after start
docker ps

# Alternative — run without Docker
node dist/index.js
```

---

## Examples by Stack

### Node.js / Express API

```bash
IDEIA generate my-api --template node-express
cd my-api
npm install
# Edit .env
npm run build
node dist/index.js
```

### Next.js Fullstack

```bash
IDEIA generate my-next --template next-fullstack
cd my-next
npm install
npm run build
npm start  # or: node .next/standalone/server.js
```

### NestJS Backend

```bash
IDEIA generate my-nest --template nest-backend
cd my-nest
npm install
npm run build
node dist/main
```

### React SPA (via nginx)

```bash
IDEIA generate my-spa --template react-spa
cd my-spa
npm install
npm run build
# output in build/ or dist/

# Serve with nginx (see nginx config above)
# Or use serve:
npx serve -s build -l 3000

# Or Express static server:
# node -e "require('express')().use(require('express').static('build')).listen(3000)"
```
