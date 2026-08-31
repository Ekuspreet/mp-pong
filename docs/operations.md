# Prototype operations

## Environment

`PORT`, `CLIENT_ORIGIN`, `DATABASE_PATH`, `SESSION_DAYS`, and `LOG_LEVEL` are documented in `.env.example`. Production also sets `NODE_ENV=production`, uses HTTPS, and keeps SQLite on persistent storage.

## Proxy and lifecycle

Forward HTTP and WebSocket upgrades for `/ws` to the same Node process. Do not balance across processes: rooms and active matches are in memory. `/health/live` checks the process and `/health/ready` checks SQLite. SIGINT/SIGTERM stop match timers and close network/database resources.

Use SQLite's online backup mechanism or stop the process before copying its files. Accounts and completed results survive restart; open rooms and active matches do not.

## Playtest checklist

1. Register and restore a session after refresh.
2. Create and join rooms by list and invite code.
3. Verify host-only start and all-ready gating.
4. Play 2-, 3-, and 4-player games through a winner.
5. Verify polygon rebuild and rectangular final duel.
6. Reconnect inside ten seconds, then test timeout forfeiture.
7. Confirm eliminated users cannot send effective input.
8. Confirm match history survives restart.
9. Record unfair serves, unclear ownership, collision surprises, latency, rally length, and desired speed/paddle adjustments.
