# Polygon Pong

A functional, server-authoritative prototype of multiplayer elimination Pong. Three or more players defend a polygon; the final two play a rectangular sudden-death duel.

See [the rules](docs/game.md) and [the implementation plan](docs/implementation-plan.md).

## Stack

- React 19, Vite, React Router, and Canvas 2D
- Express 5 and WebSockets via `ws`
- Shared strict TypeScript physics and Zod protocol contracts
- SQLite through `better-sqlite3`
- Argon2id passwords and revocable cookie sessions
- Vitest, Supertest, and WebSocket integration tests

## Run locally

Requires Node.js 22 or newer. The client and server are separate npm projects; run them in separate terminals.

First install the shared protocol package and both applications:

```bash
npm install --prefix shared
npm install --prefix server
npm install --prefix client
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Start the API server:

```bash
cd server
npm run dev
```

The server reads its environment variables from `server/.env`.

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:8080`. The API and WebSocket server runs independently on `http://localhost:3000`.

The database defaults to `data/polygon-pong.sqlite`. Rooms and active simulations live in memory; accounts and completed matches are durable.

## Verify

```bash
cd client
npm run lint
npm test
npm run build

cd ../server
npm run lint
npm run typecheck
npm test
npm run build
```

## Production

```bash
cd client && npm run build
cd ../server && npm run build
NODE_ENV=production npm start
```

Express serves `client/dist`, REST, and `/ws` on one origin. Use TLS, preserve WebSocket upgrade headers, configure `CLIENT_ORIGIN`, and persist the database directory. This prototype is single-instance only.

The interface deliberately uses plain HTML and Canvas primitives. Ranked play, chat, recovery email, replay, and horizontal scaling are outside prototype scope.

### Docker

Build from the repository root. Supply the public browser endpoints when building;
Vite embeds them in the client bundle, so runtime `-e VITE_...` variables cannot
change them (see [Vite environment variables](https://vite.dev/guide/env-and-mode)).

```bash
docker build -t polygon-pong \
  --build-arg VITE_API_BASE_URL=https://pong.example.com/api \
  --build-arg VITE_WS_BASE_URL=wss://pong.example.com/ws .

docker run -d --name polygon-pong \
  -p 127.0.0.1:3000:3000 \
  -e CLIENT_ORIGIN=https://pong.example.com \
  -v polygon-pong-data:/data \
  polygon-pong
```

Replace `pong.example.com` with your domain and forward HTTPS and WebSocket
traffic through your reverse proxy to port 3000. The container serves the built
client, API, and WebSocket endpoint together. Production session cookies require
HTTPS. `CLIENT_ORIGIN` is the public origin, without an `/api` path.

The image runs as the `node` user and includes only production dependencies.
A named volume preserves SQLite data; an existing bind-mounted data directory
must be writable by container UID 1000. Rooms and running games remain in memory
and reset when the container restarts. Build tooling and local `.env` files are
excluded from the runtime image. Each npm project uses its own lockfile.
