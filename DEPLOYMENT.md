# Build & Deployment Guide

This guide covers building and deploying everything in the `eHealth-Demos` portfolio:

1. **Static demos** — `index.html` + the three browser demos (clinical-note summarizer, HIPAA patient intake, telehealth scheduler). No build step; pure static hosting.
2. **RPM Platform** (`rpm-platform/`) — a full-stack app with an Angular frontend and a Node/Express + SQLite backend. Requires a build and a running server.

The two are independent — you can deploy the static demos in minutes and tackle the full-stack app separately.

---

## Prerequisites

| Tool | Needed for | Notes |
|------|------------|-------|
| Node.js 18+ | Building the RPM app, running the API | `node -v` to check |
| npm | Dependency install | Ships with Node |
| Docker + Docker Compose | Container deploys | Docker Desktop locally, or Docker Engine on a server |
| Git | Publishing to GitHub Pages / CI | — |
| A host account | Whichever target you pick | GitHub, Render/Railway, Vercel/Netlify, or AWS |

---

## Part A — Static demos

These files are self-contained HTML/CSS/JS. **There is no build step.**

### Option 1: GitHub Pages (free, recommended)

1. Push the repo to GitHub (public repo).
2. Repo → **Settings → Pages**.
3. Source: **Deploy from a branch** → `main` → `/root` → **Save**.
4. Live in ~1 min at `https://<username>.github.io/<repo>/`.

Because `index.html` sits at the repo root, it becomes the landing page automatically. The demo links are relative, so they work as-is.

### Option 2: Netlify / Vercel (drag-and-drop)

- Netlify: go to `app.netlify.com/drop` and drag the folder in. Instant URL.
- Vercel: `vercel` CLI or the dashboard; set the output/root directory to the folder containing `index.html`. No build command.

> If you deploy the **whole repo** to Pages/Netlify, the `rpm-platform/` source will also be uploaded but won't render — harmless. To publish only the demos, put them in their own repo or a `docs/` folder.

---

## Part B — RPM Platform

### B.1 Configure the API base URL (do this first)

The frontend currently points at the local API in **two files**:

- `rpm-platform/frontend/src/app/core/api.service.ts`
- `rpm-platform/frontend/src/app/core/auth.service.ts`

Both use:

```ts
private readonly base = 'http://localhost:3000/api';
```

For any deploy where the API is **not** on `localhost:3000`, change this to your API's public URL (e.g. `https://api.yourdomain.com/api`). For a cleaner setup, extract it into Angular environment files:

```ts
// src/environments/environment.ts  (dev)
export const environment = { apiBase: 'http://localhost:3000/api' };

// src/environments/environment.prod.ts  (prod)
export const environment = { apiBase: 'https://api.yourdomain.com/api' };
```

Import `environment.apiBase` in both services, and add a `fileReplacements` entry to the `production` configuration in `angular.json`. Rebuild after changing.

### B.2 Build

**Backend** — no compile step; just install production dependencies:

```bash
cd rpm-platform/backend
npm install --omit=dev
```

**Frontend** — produce an optimized static bundle:

```bash
cd rpm-platform/frontend
npm install
npm run build
# output: dist/rpm-frontend/browser/
```

The `browser/` folder is a static site you can host anywhere. The backend must run as a Node process (or container).

### B.3 Environment variables (backend)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | API listen port |
| `JWT_SECRET` | `dev-only-secret-change-me` | **Must** be set to a strong random value in production |
| `RPM_DB` | `./rpm.db` | SQLite file path; set to `:memory:` for tests |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

---

## Deployment targets

### 1) Docker on any VPS (most portable)

Works on DigitalOcean, Hetzner, Linode, a bare EC2 instance — anything running Docker.

```bash
# On the server, from rpm-platform/
docker compose up --build -d
```

- Frontend (nginx) → port **4200**, API → port **3000**.
- Put a reverse proxy (nginx/Caddy/Traefik) in front to terminate TLS and route your domain to these ports.
- **SQLite persistence:** the DB lives inside the backend container and is lost on rebuild. Mount a volume so it survives:

```yaml
# add to the backend service in docker-compose.yml
    volumes:
      - rpm-data:/app
# and at the bottom of the file:
volumes:
  rpm-data:
```

- Set `JWT_SECRET` via a `.env` file next to `docker-compose.yml` (Compose reads it automatically) rather than hard-coding.

**TLS quickstart with Caddy** (auto HTTPS):

```
# Caddyfile
yourdomain.com {
    reverse_proxy localhost:4200
}
api.yourdomain.com {
    reverse_proxy localhost:3000
}
```

### 2) Cloud PaaS (fastest managed path)

Split the two pieces across managed hosts.

**Backend → Render or Railway**
- New **Web Service** from the repo, root directory `rpm-platform/backend`.
- Build: `npm install --omit=dev` · Start: `node server.js`.
- Add env vars `JWT_SECRET` and `PORT` (Render provides `PORT` automatically — the app already reads it).
- **SQLite caveat:** PaaS filesystems are ephemeral. Attach a **persistent disk** (Render Disks) mounted where `rpm.db` lives, or migrate to the platform's managed **Postgres** (recommended for anything real — see the production checklist).

**Frontend → Vercel or Netlify**
- Root directory `rpm-platform/frontend`.
- Build command: `npm run build` · Publish directory: `dist/rpm-frontend/browser`.
- Add a rewrite so client-side routes fall back to `index.html`:
  - Netlify `_redirects`: `/*  /index.html  200`
  - Vercel `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- Set the API base URL (B.1) to your Render/Railway API domain before building, and make sure the backend `cors()` allows the frontend origin.

### 3) AWS (closest to a HIPAA-eligible setup)

Two common shapes:

**Simple — EC2 + Docker Compose**
1. Launch an EC2 instance (Amazon Linux 2023), install Docker + Compose plugin.
2. Clone the repo, add a `.env` with `JWT_SECRET`, run `docker compose up -d --build`.
3. Front it with an Application Load Balancer + ACM certificate for TLS, or Caddy on the box.
4. Attach an EBS volume for SQLite persistence, or point the app at RDS (below).

**Scalable — ECS Fargate + RDS**
1. Build and push both images to **ECR** (`backend` and `frontend`).
2. Create an **ECS Fargate** service for each, behind an **ALB** (path `/api/*` → backend target group, everything else → frontend).
3. Replace SQLite with **RDS for PostgreSQL** (the `db.js` query layer is small and swappable).
4. Store `JWT_SECRET` and DB credentials in **AWS Secrets Manager**; inject as task env vars.
5. Terminate TLS at the ALB with an **ACM** certificate.

**HIPAA note:** production PHI on AWS requires a signed **Business Associate Addendum (BAA)**, encryption in transit (TLS) and at rest (RDS/EBS encryption, KMS), private subnets, and CloudTrail/CloudWatch audit logging. This demo uses synthetic data and is **not** HIPAA-configured out of the box.

### 4) GitHub Pages (frontend only, with an external API)

GitHub Pages serves **static files only** — it can host the built Angular frontend but **cannot run the Node API**. Use it only if the backend is deployed elsewhere (target 1–3) and reachable over HTTPS.

```bash
cd rpm-platform/frontend
# base-href must match the repo subpath when served from <user>.github.io/<repo>/
npm run build -- --base-href /<repo>/
```

Publish `dist/rpm-frontend/browser` to the `gh-pages` branch (e.g. with the `angular-cli-ghpages` package: `npx angular-cli-ghpages --dir=dist/rpm-frontend/browser`). Set the API base URL (B.1) to your hosted API, and ensure that API allows the Pages origin via CORS.

> The static demos in **Part A** are the natural fit for GitHub Pages; the full RPM app is better served by targets 1–3.

---

## Production readiness checklist

- [ ] `JWT_SECRET` set to a strong random value via environment/secret, never committed.
- [ ] TLS/HTTPS in front of both frontend and API.
- [ ] API base URL points at the deployed API, not `localhost` (B.1).
- [ ] `cors()` restricted to your frontend origin instead of allowing all.
- [ ] SQLite replaced with a managed database (Postgres) for anything beyond a demo — or at minimum a persistent volume.
- [ ] Database backups configured.
- [ ] For PHI: signed BAA with the cloud provider, encryption at rest, private networking, and audit logging.
- [ ] Health checks wired to your platform (the API exposes `GET /api/health`).

---

## Optional: CI/CD with GitHub Actions

A minimal pipeline that runs tests on every push, then builds:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: rpm-platform/backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npm test
  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: rpm-platform/frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npm test
      - run: npm run build
```

Extend with a deploy job (push images to ECR, or trigger a Render/Vercel deploy hook) once tests pass.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Frontend loads but every API call fails | API base URL still `localhost:3000` | Update B.1 and rebuild |
| API calls blocked in browser console (CORS) | Backend `cors()` origin | Allow the frontend origin |
| Refreshing a route → 404 on the host | No SPA fallback | Add the rewrite/`try_files` rule for that host |
| Data resets after redeploy | Ephemeral SQLite file | Mount a volume or use managed Postgres |
| `better-sqlite3` build error on install | Missing build tools | Install `python3 make g++` (the backend Dockerfile already does) |
| 401 on every request after login | `JWT_SECRET` differs between restarts/instances | Set a fixed secret via env for all instances |
