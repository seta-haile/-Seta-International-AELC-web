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
reverse-proxy/TLS setup.
