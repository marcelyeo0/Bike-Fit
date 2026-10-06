# syntax=docker/dockerfile:1

# Image Node LTS en version figee. Compatible avec `next` (>= 20.9) et
# `prisma` (>= 24.0) du package.json. Debian slim plutot qu'Alpine : le moteur
# de schema de Prisma (utilise par `migrate deploy`) est un binaire natif lie
# a OpenSSL et a la glibc.
ARG NODE_VERSION=24.21.0

# ---------------------------------------------------------------------------
# base : socle commun
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---------------------------------------------------------------------------
# deps : toutes les dependances, devDependencies comprises
# ---------------------------------------------------------------------------
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Le `postinstall` lance `prisma generate` : le schema et la config Prisma
# doivent etre la AVANT `npm ci`. Le client est genere dans
# src/generated/prisma. Aucune DATABASE_URL n'est necessaire a la generation.
COPY package.json package-lock.json prisma7.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------------------
# migrate : tache ponctuelle (migrations + seed)
# ---------------------------------------------------------------------------
# Part de `deps` et non de l'image d'execution : `prisma` et `tsx` sont des
# devDependencies, absentes du serveur autonome.
FROM deps AS migrate
COPY tsconfig.json ./
COPY docker/migrer.sh ./docker/migrer.sh
USER node
CMD ["sh", "docker/migrer.sh"]

# ---------------------------------------------------------------------------
# build : `next build`
# ---------------------------------------------------------------------------
FROM deps AS build

# Les NEXT_PUBLIC_* sont figees dans le bundle client au build : elles doivent
# arriver ici, en ARG. Ce sont des valeurs publiques (elles finissent dans le
# JavaScript servi au navigateur). Aucun secret ne passe par ARG ni ENV :
# CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET et DATABASE_URL ne sont fournis qu'a
# l'execution, par compose.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/dashboard
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_URL} \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_URL} \
    NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL} \
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL} \
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}

# `.dockerignore` ecarte node_modules, .next, .env et src/generated : cette
# copie n'ecrase donc ni les dependances ni le client Prisma de l'etape deps.
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# run : serveur autonome, utilisateur non root
# ---------------------------------------------------------------------------
FROM base AS run
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

# L'image slim n'a ni curl ni wget : la sonde passe par le `fetch` de Node.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/sante').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
