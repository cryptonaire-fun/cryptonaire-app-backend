# syntax=docker/dockerfile:1

# --- Base stage ---
FROM oven/bun:1 AS base
WORKDIR /app

# --- Install dependencies ---
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# --- Production image ---
FROM base AS runtime

ENV NODE_ENV=production

# Don't run as root
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup appuser

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER appuser

EXPOSE 4000

CMD ["bun", "run", "src/server.ts"]
