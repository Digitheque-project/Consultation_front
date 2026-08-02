# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────
# CHU-Front — image de production (Next.js 16, output: "standalone")
#
# Build (les variables NEXT_PUBLIC_* sont figées dans le bundle JS au
# build, PAS au runtime — il faut les passer en --build-arg avec les
# vraies URL du réseau local du CHU) :
#
#   docker build \
#     --build-arg NEXT_PUBLIC_CONSULTATION_EXTERNE_URL=http://consultation-back.local/consultation/api \
#     --build-arg NEXT_PUBLIC_API_URL=http://consultation-back.local \
#     --build-arg NEXT_PUBLIC_PRESCRIPTION_URL=http://prescription-back.local \
#     --build-arg NEXT_PUBLIC_PHARMACIE_URL=http://pharmacie-back.local \
#     --build-arg NEXT_PUBLIC_CLINICAL_API_URL=http://consultation-back.local \
#     --build-arg NEXT_PUBLIC_NOTIFICATION_URL=http://notification-back.local \
#     --build-arg NEXT_PUBLIC_AUTH_CLIENT_URL=http://auth-client.local/login \
#     --build-arg NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
#     --build-arg NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
#     -t chu-front .
#
# Voir .env.example pour le détail et le rôle de chaque variable.
#
# Run :
#   docker run -p 3000:3000 chu-front
# ─────────────────────────────────────────────────────────────────────────

# ── Étape 1 : dépendances ───────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Étape 2 : build ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables publiques (préfixe NEXT_PUBLIC_) : inlinées dans le bundle JS
# pendant "next build", donc obligatoires à l'étape de build, pas au run.
ARG NEXT_PUBLIC_CONSULTATION_EXTERNE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_PRESCRIPTION_URL
ARG NEXT_PUBLIC_PHARMACIE_URL
ARG NEXT_PUBLIC_CLINICAL_API_URL
ARG NEXT_PUBLIC_NOTIFICATION_URL
ARG NEXT_PUBLIC_AUTH_CLIENT_URL
ARG NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID
ARG NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID
ENV NEXT_PUBLIC_CONSULTATION_EXTERNE_URL=$NEXT_PUBLIC_CONSULTATION_EXTERNE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_PRESCRIPTION_URL=$NEXT_PUBLIC_PRESCRIPTION_URL \
    NEXT_PUBLIC_PHARMACIE_URL=$NEXT_PUBLIC_PHARMACIE_URL \
    NEXT_PUBLIC_CLINICAL_API_URL=$NEXT_PUBLIC_CLINICAL_API_URL \
    NEXT_PUBLIC_NOTIFICATION_URL=$NEXT_PUBLIC_NOTIFICATION_URL \
    NEXT_PUBLIC_AUTH_CLIENT_URL=$NEXT_PUBLIC_AUTH_CLIENT_URL \
    NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID=$NEXT_PUBLIC_CONSULTATION_EXTERNE_SERVICE_ID \
    NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID=$NEXT_PUBLIC_CLINICAL_DEFAULT_SERVICE_ID \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Étape 3 : image de production ────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# output: "standalone" ne copie ni public/ ni .next/static — à faire à la main.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
