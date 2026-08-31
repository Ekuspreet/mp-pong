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

Requires Node.js 22 or newer.

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Create two browser accounts (a private window is useful), create/join a room, ready both players, and start. Use arrow keys or WASD.

The database defaults to `data/polygon-pong.sqlite`. Rooms and active simulations live in memory; accounts and completed matches are durable.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Production

```bash
npm run build
NODE_ENV=production npm start -w @polygon-pong/server
```

Express serves `client/dist`, REST, and `/ws` on one origin. Use TLS, preserve WebSocket upgrade headers, configure `CLIENT_ORIGIN`, and persist the database directory. This prototype is single-instance only.

The interface deliberately uses plain HTML and Canvas primitives. Ranked play, chat, recovery email, replay, and horizontal scaling are outside prototype scope.
