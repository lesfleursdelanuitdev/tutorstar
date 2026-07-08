# TutorStar — Next.js 16 production image (rootless Podman).
#
# Single-stage `next start` (no `output: standalone`), chosen deliberately so the
# repo's next.config.ts needs NO edit. next.config.ts sets distDir=.next-<user>;
# build AND runtime both run as root here, so both resolve to `.next-root` — keep
# them the same user or the runtime won't find the build.
#
# Build context is the tutorstar repo root. Build with deploy/build-image.sh, which
# mounts the real .env as an ephemeral build secret (Next auto-loads .env.local) and
# uses --network host so DATABASE_URL (127.0.0.1:5432) reaches host Postgres for any
# pages that prerender against the DB. No secret is baked into image layers.
#
# Slimming later (optional, not now): add `output: "standalone"` to next.config.ts
# (a 1-line change) and switch to a multi-stage copy of .next/standalone.
FROM docker.io/library/node:22-bookworm-slim
WORKDIR /app

# Install ALL deps (build needs typescript/tailwind/etc). NODE_ENV is deliberately
# NOT set to production here, or npm would omit devDependencies and the build fails.
COPY package.json package-lock.json ./
RUN npm ci

# App source (node_modules, .next-*, .env, .git excluded via deploy/.dockerignore).
COPY . .

# Production build. .env.local is mounted only for this step and never persisted.
RUN --mount=type=secret,id=dotenv,target=/app/.env.local \
    npm run build

# Runtime settings. Actual DB URL / auth secret / Resend key are injected at run
# time by the Quadlet unit (Environment= + Secret=), never through this image.
ENV NODE_ENV=production \
    PORT=3041 \
    HOSTNAME=0.0.0.0

EXPOSE 3041
CMD ["npm", "run", "start", "--", "-p", "3041", "-H", "0.0.0.0"]
