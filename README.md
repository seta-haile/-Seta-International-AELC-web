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

Migrations are committed under `apps/api/drizzle/` and applied automatically
by the `api` container on startup (see `apps/api/src/db/migrate.ts`).

## Production deploy (VPS + Docker)

Each app has its own multi-stage `Dockerfile` (build context must be the
repo root, since this is a pnpm workspace):

```bash
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t aelc-web .
docker build -f apps/api/Dockerfile -t aelc-api .
```

Or bring up the whole stack (Postgres + api + web) with
`docker-compose.prod.yml`:

```bash
export POSTGRES_PASSWORD=change-me
export CORS_ORIGIN=https://app.example.com
export NEXT_PUBLIC_API_URL=https://api.example.com

docker compose -f docker-compose.prod.yml up -d --build
```

The `api` container runs pending Drizzle migrations before starting the
server. Put nginx (or another reverse proxy) in front of ports `3000`
(web) and `3001` (api) on the VPS and terminate TLS there — this repo
does not include a reverse-proxy/TLS setup.
