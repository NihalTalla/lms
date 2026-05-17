FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --shell /usr/sbin/nologin runner

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl -fsS http://localhost:3000/health || exit 1

USER runner
CMD ["node", "dist/src/server.js"]