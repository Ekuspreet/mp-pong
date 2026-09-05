# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Public browser endpoints are embedded by Vite at build time.
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
RUN test -n "$VITE_API_BASE_URL" && test -n "$VITE_WS_BASE_URL" \
    || (echo "Set VITE_API_BASE_URL and VITE_WS_BASE_URL as build arguments" >&2; exit 1)
RUN npm run build

FROM node:22-bookworm-slim AS server-build
# Native SQLite/Argon2 dependencies may need compilation on the target platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY shared/package.json shared/package-lock.json ./shared/
RUN npm ci --prefix shared
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server
COPY shared/ ./shared/
COPY server/ ./server/
# The server prebuild script builds shared first.
RUN npm run build --prefix server
RUN npm prune --omit=dev --prefix server && npm prune --omit=dev --prefix shared

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/data/polygon-pong.sqlite
WORKDIR /app
# Preserve /app/server/node_modules/@polygon-pong/shared -> /app/shared.
COPY --from=server-build /app/server/package.json ./server/package.json
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/shared/package.json ./shared/package.json
COPY --from=server-build /app/shared/node_modules ./shared/node_modules
COPY --from=server-build /app/shared/dist ./shared/dist
COPY --from=client-build /app/client/dist ./client/dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
