# Build context must be the repo root (pnpm monorepo):
#   docker build -f apps/api/Dockerfile -t aelc-api .
FROM node:24-alpine AS base
RUN corepack enable
ENV CI=true
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter api...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter api build

FROM base AS runner
ENV NODE_ENV=production
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter api... --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/drizzle ./apps/api/drizzle

RUN addgroup --system --gid 1001 nestjs && adduser --system --uid 1001 nestjs
USER nestjs

EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/api/dist/main.js"]
