# AELC Platform

Monorepo (pnpm workspaces) with:

- **apps/web** — Next.js, TypeScript, Tailwind, Shadcn UI, TanStack Query
- **apps/api** — NestJS, TypeScript, PostgreSQL, Drizzle ORM

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

docker compose up -d        # starts PostgreSQL on :5434
pnpm --filter api db:push   # push schema to the database

pnpm dev:web                # http://localhost:3000
pnpm dev:api                # http://localhost:3001
```

## Database

Schema lives in `apps/api/src/db/schema`. After changing it:

```bash
pnpm db:generate   # generate SQL migration
pnpm db:migrate    # apply migrations locally
pnpm db:studio     # browse data with Drizzle Studio
```

Migrations are committed under `apps/api/drizzle/`. They are **not** applied
automatically by the `api` container — run them explicitly after the
container is up:

```bash
docker compose exec api node apps/api/dist/db/migrate.js
```

Run this once after the first `docker compose up -d --build`, and again
after any deploy that adds new migrations.

## Deploy with Docker

`docker-compose.yml` builds and runs Postgres + `api` + `web` together:

```bash
cp apps/api/.env.example apps/api/.env   # fill in real values, see comments in the file
docker compose up -d --build
docker compose exec api node apps/api/dist/db/migrate.js
```

`apps/api/.env` (untracked, lives only on the deploy machine) must set
`DATABASE_URL` to the *docker-network* form — `postgres://postgres:postgres@postgres:5432/aelc`
(service name `postgres`, container port `5432`) — not `localhost`, since
`localhost` inside the `api` container refers to the container itself, not
the `postgres` service.

The `web` service currently builds without a `NEXT_PUBLIC_API_URL` build
arg in `docker-compose.yml`, so `process.env.NEXT_PUBLIC_API_URL` is empty
in the built frontend — add a `build.args` entry there once the frontend
actually calls the API from the browser.

Put nginx (or another reverse proxy) in front of ports `3000` (web) and
`3001` (api) and terminate TLS there — this repo does not include a
reverse-proxy/TLS setup. For internal deploys, use a certificate issued by
the internal CA (AD CS) against a real internal DNS name rather than a
self-signed cert — see
[docs/tls-internal-ca-setup.md](docs/tls-internal-ca-setup.md).

## Production deploy (`docker-compose.prod.yml`)

The `.github/workflows/deploy.yml` self-hosted pipeline runs
`docker compose -f docker-compose.prod.yml` on the deploy machine, **not**
the plain `docker-compose.yml` used for local dev. This matters because the
two files read configuration differently:

- `docker-compose.yml` (dev) loads the `api` service's environment from
  `apps/api/.env` via `env_file:`.
- `docker-compose.prod.yml` reads required variables straight from the
  **shell environment Docker Compose runs in**, which for a plain `.env`
  file means one at the **repo root** (`C:\apps\aelc-platform\.env`) —
  Compose loads that automatically — not `apps/api/.env`. `docker compose`
  fails fast with a clear `variable is required` error if any of the
  `:?required` ones below are missing, instead of the API silently
  crashing on boot or (worse) silently running with the wrong value.

Create `C:\apps\aelc-platform\.env` on the deploy machine with:

```bash
POSTGRES_PASSWORD=<real password, matches whatever Postgres was initialized with>
CORS_ORIGIN=http://<deploy-host>:3000        # or https://<domain> once TLS is in front
NEXT_PUBLIC_API_URL=http://<deploy-host>:3001 # or the public API URL through the reverse proxy
JWT_SECRET=<long random string>

# AELC central consumer API — see docs/superpowers/specs/2026-09-17-central-consumer-api-and-aelc-platform-sync-design.vi.md
# on the AELC side. CONSUMER_API_TOKEN is issued out-of-band via
# `engineering-central admin consumer issue --label <label>` on the AELC
# central host, not generated here. Both are required by
# docker-compose.prod.yml — if either is missing, `docker compose up` fails
# immediately rather than deploying with governance sync silently disabled.
CONSUMER_API_BASE_URL=http://<aelc-central-host>:8080
CONSUMER_API_TOKEN=<credential issued by engineering-central admin consumer issue>
```

After a deploy, check sync is actually running (not just that web/api
answer HTTP 200) via `GET http://localhost:3001/sync/health` on the deploy
machine — it reports, per job (`records`, `completeness`): whether it's
configured, the last successful run, the last error, and the consecutive
failure count. The deploy workflow checks this automatically and posts a
`::warning::` (without failing the deploy) if sync isn't configured or has
failed more than a few times in a row — check the Actions run's annotations
if `/dashboard-test` looks empty after a deploy.
