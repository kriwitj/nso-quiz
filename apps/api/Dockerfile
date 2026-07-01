# ── Stage 1: Install all workspace dependencies from monorepo root ─────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root workspace manifests first (for better layer caching)
COPY package.json package-lock.json ./

# Copy workspace package manifests (needed for npm workspaces to resolve correctly)
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Copy prisma schema (needed before install in case of postinstall hooks)
COPY apps/api/prisma ./apps/api/prisma/

# Install all dependencies workspace-aware (hoisted to /app/node_modules)
RUN npm ci --ignore-scripts

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Bring hoisted node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source needed for the API build
COPY packages/shared ./packages/shared/
COPY apps/api ./apps/api/
COPY package.json turbo.json ./

# Generate Prisma client, build shared package, then build NestJS
WORKDIR /app
RUN npm run build -w packages/shared
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Lean production image ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output, production deps, prisma
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/packages/shared ./packages/shared

# Copy the full hoisted node_modules (includes Prisma client & all runtime deps)
COPY --from=builder /app/node_modules ./node_modules

# Sync schema with DB (idempotent — safe to run on every startup)
CMD ["sh", "-c", "npx prisma db push --accept-data-loss=false && node dist/apps/api/src/main.js"]

EXPOSE 4000
