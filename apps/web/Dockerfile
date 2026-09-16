# Build context must be the repo root (pnpm monorepo)
# docker build -f apps/web/Dockerfile -t aelc-web .

FROM node:24-alpine AS base

RUN corepack enable

ENV CI=true

WORKDIR /app


FROM base AS deps

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile --filter web...


FROM base AS builder

ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=deps /app/node_modules ./node_modules

COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter web build


FROM base AS runner

ENV NODE_ENV=production

ENV NEXT_TELEMETRY_DISABLED=1


RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs


COPY --from=builder /app/apps/web/.next/standalone ./

COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

COPY --from=builder /app/apps/web/public ./apps/web/public


USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "apps/web/server.js"]