# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.ts reads these at BUILD time (rewrites to the API, CSP headers) and they
# end up baked into the standalone server: set them as build args, not only at runtime.
ARG API_URL=http://api:8081
ARG FILES_ORIGIN=
ARG SITE_URL=
ENV API_URL=$API_URL FILES_ORIGIN=$FILES_ORIGIN SITE_URL=$SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
