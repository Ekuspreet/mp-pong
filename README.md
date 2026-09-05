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

Run the client and server from the repository root:

```bash
docker compose up --build
```

Open `http://localhost:8080`. The client runs Vite's development server and
connects to the API and WebSocket server on port 3000. Both Dockerfiles use the
repository root as their build context. Local `.env` files are excluded;
Compose supplies the environment variables.

SQLite data is saved in the `pong-data` volume. Stop with `docker compose down`.
Use `docker compose down -v` only when you also want to delete the database.
