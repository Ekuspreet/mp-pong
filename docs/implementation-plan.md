# Polygon Pong: Functional Prototype Implementation Plan

**Status:** Proposed  
**Ruleset:** [`docs/game.md`](./game.md), version 1.0  
**Primary goal:** Validate that server-authoritative polygon Pong is understandable, fair, responsive, and fun for 2–8 browser players.  
**Prototype constraint:** Functionality and observability take priority over visual design.

## 1. Product objectives

The prototype is successful when it can demonstrate the complete standard match loop:

1. A person can register, sign in, and remain signed in after a page refresh.
2. A signed-in player can create or join a room and mark themselves ready.
3. A room host can start a match with 2–8 ready players.
4. The server alone advances paddles, ball physics, collisions, eliminations, stage transitions, and results.
5. Three or more players play in a regular polygon; the final two play sudden-death square Pong.
6. A disconnected player can reconnect within ten seconds; otherwise they forfeit.
7. Eliminated players can spectate and all players see final placements.
8. Match results and useful playtest statistics are saved in SQLite.
9. The core rules are covered by deterministic automated tests.

### Explicit prototype non-goals

- Ranked matchmaking, ratings, tournaments, teams, bots, chat, friends, cosmetics, payments, mobile-native apps, and admin dashboards.
- Multiple balls, lives, power-ups, or other optional modes from the rules.
- Production-grade horizontal scaling. A match lives in one Node process; SQLite and in-memory rooms are appropriate for a single-instance prototype.
- Sophisticated client prediction. Local paddle prediction and server reconciliation may be added after the authoritative loop is proven.
- Elaborate graphics. Canvas primitives, HTML forms, basic status text, and accessible controls are sufficient.

## 2. Recommended stack

Use TypeScript throughout even though the Express runtime is JavaScript. It keeps network messages, game state, and physics contracts synchronized across packages and still compiles to ordinary Node.js JavaScript.

| Area                | Choice                                                                                       | Reason                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Monorepo            | npm workspaces                                                                               | Already configured and sufficient for three packages.                                                                         |
| Runtime             | Node.js 22 LTS                                                                               | Stable runtime with modern web APIs and good TypeScript tooling.                                                              |
| Server HTTP         | Express 5                                                                                    | REST endpoints, middleware, health checks, and static production hosting.                                                     |
| Real-time transport | `ws`                                                                                         | Small, direct WebSocket layer; avoids hiding protocol and authority decisions.                                                |
| Client              | React 19 + Vite                                                                              | Already scaffolded; fast iteration and simple production build.                                                               |
| Rendering           | HTML Canvas 2D                                                                               | Efficient for a moving polygon, paddles, and ball without a game-engine dependency.                                           |
| Routing             | React Router                                                                                 | Clear auth, lobby, room, match, and results routes.                                                                           |
| Data fetching       | Native `fetch` plus a small API module                                                       | Prototype needs are modest; avoid unnecessary client-state machinery.                                                         |
| Database            | SQLite 3 via `better-sqlite3`                                                                | Synchronous transactions are simple and reliable for a single-process game server. It stores a standard SQLite database file. |
| Schema/migrations   | Drizzle ORM + Drizzle Kit                                                                    | Typed schema and reviewable SQL migrations without a heavy runtime.                                                           |
| Validation          | Zod                                                                                          | Validate REST bodies, environment variables, and every WebSocket message.                                                     |
| Authentication      | Argon2id password hashes; opaque random session tokens in `HttpOnly`, `SameSite=Lax` cookies | Simple revocable sessions; no JWT revocation complexity. Store only a token hash in the database.                             |
| Logging             | Pino + request IDs                                                                           | Structured server, room, match, and connection logs.                                                                          |
| Tests               | Vitest; Supertest; React Testing Library                                                     | Unit physics tests, REST integration tests, socket integration tests, and lightweight UI tests.                               |
| Formatting/linting  | Prettier + Oxlint + TypeScript strict mode                                                   | Fast, consistent checks across workspaces.                                                                                    |
| Local operations    | `.env`, npm scripts, optional Dockerfile                                                     | One-command development and a straightforward single-instance deployment.                                                     |

`node-sqlite3` can be substituted if “sqlite3” specifically means that package, but `better-sqlite3` is preferable here because game persistence is low-volume and transaction-oriented. SQLite must never be queried from the fixed-rate game tick; write stage/match results only outside latency-sensitive simulation work.

## 3. Target repository structure

```text
mp-pong/
├── client/
│   └── src/
│       ├── api/                 # REST client and WebSocket client
│       ├── auth/                # session context and protected routes
│       ├── game/                # canvas renderer, input, interpolation
│       ├── pages/               # login, register, lobby, room, match, results
│       └── test/
├── server/
│   └── src/
│       ├── auth/                # password and session services
│       ├── db/                  # schema, migrations, repositories
│       ├── game/                # authoritative match runtime and tick loop
│       ├── http/                # Express routes and middleware
│       ├── rooms/               # room lifecycle and membership
│       ├── ws/                  # upgrade auth, protocol dispatch, heartbeat
│       ├── app.ts               # testable Express application
│       └── index.ts             # HTTP/WebSocket process bootstrap
├── shared/
│   └── src/
│       ├── protocol/            # Zod schemas and inferred message types
│       ├── game/                # state, geometry, collision, simulation
│       └── config/              # ruleset defaults
└── docs/
    ├── game.md
    └── implementation-plan.md
```

## 4. System boundaries and source of truth

### REST responsibilities

REST is used for durable or request/response operations:

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/rooms`, `POST /api/rooms`
- `GET /api/rooms/:roomId` for refresh/bootstrap
- `GET /api/matches/:matchId` for completed results
- `GET /health/live` and `GET /health/ready`

Joining, leaving, ready state, hosting actions, gameplay input, live state, and reconnection use WebSockets so room membership and presence have one ordered event stream.

### WebSocket lifecycle

The browser connects to `/ws` using the existing session cookie. The server authenticates the HTTP upgrade, assigns a connection ID, sends `server.hello`, and requires a validated client envelope containing `type`, `requestId`, and `payload`. Server messages contain `type`, `sequence`, `serverTime`, and `payload`.

Essential client messages:

- `room.join`, `room.leave`, `room.ready`, `room.start`
- `input.set` with monotonically increasing input sequence and direction `-1 | 0 | 1`
- `connection.resume` with match ID and last received server sequence
- `ping`

Essential server messages:

- `ack`, `error`, `room.snapshot`, `room.playerJoined`, `room.playerLeft`, `room.readyChanged`
- `match.started`, `stage.countdown`, `game.snapshot`, `player.eliminated`, `stage.transition`, `match.ended`, `match.noContest`
- `connection.status`, `pong`

Unknown, malformed, unauthorized, stale, and rate-excessive messages are rejected without mutating game state. Clients never send positions, collision claims, scores, elimination claims, or timestamps used as simulation truth.

### Authoritative simulation

- Run each active match at a fixed simulation tick, initially 60 Hz, using a monotonic server clock and an accumulator to handle event-loop jitter.
- Broadcast snapshots at 20 Hz initially. Each contains tick, stage ID, server time, arena geometry, ball, paddles, player status, countdown, and recent event sequence.
- Keep rooms and active match state in memory. SQLite stores identities, sessions, and completed facts, not per-tick state.
- Integrate paddle movement from the latest accepted direction input and clamp its scalar side position.
- Use swept-circle/time-of-impact collision tests so a fast ball cannot tunnel through a paddle or boundary.
- Resolve the earliest collision within a tick, consume the remaining substep, and cap collision iterations to avoid infinite loops.
- Treat simultaneous vertex contacts as neutral according to the rules, using a documented epsilon and deterministic tie-breaking.
- Seed the server PRNG per stage and save the seed. Reject serve directions near tangents or vertices so failures can be replayed in tests.
- Apply contact offset and bounded paddle-motion influence to returns, enforce a minimum inward angle, increase speed predictably, and clamp it to the configured cap.
- Emit immutable domain events for return, miss, elimination, stage start, disconnect, forfeit, and match end. Persistence and network presentation consume those events.

### Client presentation

The client renders the latest authoritative state to Canvas. It buffers two snapshots and interpolates other entities against a slightly delayed render time. The local paddle may be predicted from current held input, then smoothly reconciled to the authoritative snapshot. A debug toggle should display tick, ping, connection state, ball speed, stage, and collision normals; this is more valuable than visual polish during playtesting.

## 5. Data model

Use UUIDs or ULIDs as externally visible IDs and integer SQLite primary keys internally if desired. Store all timestamps as UTC integers or ISO strings consistently.

| Table           | Important fields                                                                                                                              | Notes                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `users`         | `id`, `username_normalized` unique, `username_display`, `password_hash`, `created_at`, `last_seen_at`                                         | Start with username/password; email recovery and verification are out of scope. |
| `sessions`      | `id`, `user_id`, `token_hash` unique, `created_at`, `expires_at`, `last_used_at`, `revoked_at`                                                | Cookie carries raw random token; DB stores its SHA-256 hash.                    |
| `matches`       | `id`, `room_code`, `ruleset_version`, `status`, `started_at`, `ended_at`, `winner_user_id`, `no_contest_reason`, `initial_player_count`       | Insert at match start, finalize transactionally.                                |
| `match_players` | `match_id`, `user_id`, `initial_order`, `placement`, `eliminated_at`, `elimination_reason`, `returns`, `longest_rally_returns`, `survival_ms` | Unique on match/player and placement where applicable.                          |
| `match_stages`  | `id`, `match_id`, `stage_number`, `player_count`, `arena_type`, `serve_seed`, `started_at`, `ended_at`, `eliminated_user_id`                  | Useful for debugging fairness and replaying serves.                             |

Rooms do not need persistence in the prototype. They disappear when empty or after an inactivity timeout. Use an unambiguous, case-insensitive six-character invite code; never expose internal maps or session identifiers.

### Game creation options

Every room stores one format identifier and zero or more unique modifier identifiers under `room.options`. These values are configuration metadata for now; implementing their simulation and scoring behavior is separate work.

```json
{
  "options": {
    "format": "stocks",
    "modifiers": ["vortex", "wormhole"]
  }
}
```

`POST /api/rooms` accepts this structure, validates identifiers, and defaults to `{ "format": "elimination", "modifiers": [] }`. Room list, room detail, and WebSocket snapshots return the same structure. Open rooms are currently process-local, so the options live on the in-memory room alongside visibility and membership. When durable/open-room storage is introduced, store `format_id` as a constrained string and modifiers in a normalized `room_modifiers(room_id, modifier_id)` table. Match history should copy these values at match start so completed results remain reproducible after the room disappears.

Formats (choose exactly one):

| Identifier    | Name        | Behavior                                                                                                                                                                                                        |
| ------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `elimination` | Elimination | A miss eliminates the defender, and the polygon is rebuilt after each elimination.                                                                                                                              |
| `best_score`  | Best Score  | Nobody is eliminated until a player reaches 25 misses. Each miss counts against its defender; when the limit is reached, the player with the fewest misses wins. |
| `stocks`      | Stocks      | Each player starts with three lives. A miss loses one life; causing an opponent to miss grants 0.5 lives. The arena shrinks only when a player loses their final life.                                          |

Modifiers (choose any number):

| Identifier  | Name      | Behavior                                                                                |
| ----------- | --------- | --------------------------------------------------------------------------------------- |
| `vortex`    | Vortex    | A central vortex curves the ball and pushes it outward with increasing strength.        |
| `pulse`     | Pulse     | The center releases a visible shockwave at regular intervals, pushing the ball outward. |
| `orbit`     | Orbit     | A gravity well moves around the arena, bending the ball's path when it passes nearby.   |
| `wormhole`  | Wormhole  | Two portals teleport the ball while preserving its speed and entry angle.               |
| `multiball` | Multiball | A second ball appears after a rally reaches a configured number of returns.             |

## 6. Room and match state machines

Room lifecycle:

```text
OPEN -> STARTING -> IN_MATCH -> FINISHED -> CLOSED
  ^         |           |
  +---------+-----------+  (safe start failure or match cancellation)
```

- Capacity is 2–8 active seats. Spectator capacity can be separately bounded.
- The creator is host. If the host leaves before a match, transfer host to the earliest joined player.
- A player may occupy at most one room and one active match in a process.
- Starting requires at least two members, all members ready, and only the host may request it.
- The room becomes locked when starting; mid-match joins are spectators only if enabled.
- Repeated commands are idempotent or rejected with stable error codes.

Match lifecycle:

```text
COUNTDOWN -> PLAYING -> TRANSITION -> COUNTDOWN -> ... -> COMPLETE
     |          |             |
     +----------+-------------+------------------------> NO_CONTEST
```

On a miss or forfeit, stop simulation, record exactly one elimination, preserve survivors' clockwise order, rebuild and recenter, reset speed, choose a fair serve, and begin a new countdown. With two survivors, map the earlier clockwise survivor to left and the next to right deterministically. With one survivor, end and persist the match.

## 7. Commit-by-commit implementation roadmap

Each commit should build and pass the checks introduced up to that point. Commit titles below are suggested conventional-commit messages; the objective beneath each is the acceptance boundary for that commit.

### Phase A — Foundation and contracts

#### Commit 1 — `chore: normalize TypeScript workspace tooling`

**Objective:** Make the current scaffold a repeatable three-workspace development environment.

- Add the `server` workspace and package manifests for all packages.
- Add root scripts for `dev`, `build`, `typecheck`, `lint`, `format`, and `test`.
- Configure strict TypeScript, Vitest, Prettier, Oxlint, `.editorconfig`, supported Node version, and environment example.
- Use a concurrent dev runner for Vite and the server; proxy `/api` and `/ws` from Vite.
- Replace placeholder root README instructions with exact setup and command documentation.

**Done when:** a clean install followed by `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` succeeds.

#### Commit 2 — `feat(shared): define rules configuration and protocol schemas`

**Objective:** Establish one validated contract shared by browser and server.

- Define branded IDs, player/room/match states, arena/ball/paddle snapshots, domain events, REST DTOs, and error codes.
- Add Zod discriminated unions for every WebSocket message and envelope.
- Centralize versioned defaults: counts, dimensions, 3-second countdown, 30% paddle, speeds, acceleration, cap, tick/snapshot rates, and 10-second reconnect grace.
- Reject incompatible protocol/ruleset versions explicitly.

**Done when:** schema tests accept valid examples, reject malformed/privileged client messages, and shared exports build for Node and browser.

#### Commit 3 — `feat(server): bootstrap Express and WebSocket transport`

**Objective:** Provide a testable process with HTTP and authenticated-upgrade-ready WebSocket plumbing.

- Split `createApp()` from process startup.
- Add JSON limits, CORS configuration for development, security headers, request IDs, structured logging, central error handling, graceful shutdown, and liveness/readiness routes.
- Attach one `ws` server to the HTTP server; implement message size limits, parse/validation errors, heartbeat ping/pong, and cleanup.
- Add configuration validation and fail fast on invalid secrets, ports, or database paths.

**Done when:** health tests pass, a test socket completes hello/ping/pong, malformed frames get stable errors, and shutdown closes HTTP/socket connections.

### Phase B — Identity and lobby

#### Commit 4 — `feat(db): add SQLite schema and migration workflow`

**Objective:** Create durable storage with reproducible schema changes.

- Add Drizzle schema for users, sessions, matches, match players, and stages, including foreign keys, uniqueness, and indexes.
- Enable WAL mode, foreign keys, a busy timeout, and startup migrations.
- Add repository boundaries and transaction helpers; use a temporary database in tests.

**Done when:** migrations apply to an empty database, re-running is safe, constraints are tested, and the server readiness check verifies DB access.

#### Commit 5 — `feat(auth): implement account and session REST APIs`

**Objective:** Support secure registration, login, logout, and session restoration.

- Normalize and validate usernames; define length/character and password rules.
- Hash passwords with Argon2id and compare without leaking account existence through distinct login errors.
- Create high-entropy opaque sessions, store token hashes, set secure cookie options by environment, rotate on login, expire/revoke sessions, and attach the user to requests.
- Rate-limit register/login by IP and username key; never log passwords, cookies, or tokens.

**Done when:** integration tests cover register, duplicate names, login success/failure, `me`, logout, expiry, and protected-route rejection.

#### Commit 6 — `feat(rooms): implement room registry and REST discovery`

**Objective:** Model reliable in-memory rooms independently of transport.

- Implement room creation, unique invite codes, listing of public open rooms, lookup, host transfer, capacity, membership uniqueness, and empty-room expiry.
- Expose create/list/get REST endpoints and keep mutation rules in a room service.
- Define room visibility as public or invite-only; default the prototype to public unless the creator chooses otherwise.

**Done when:** service and API tests cover capacity, collisions, host transfer, missing rooms, visibility, and cleanup.

#### Commit 7 — `feat(rooms): add real-time membership and ready flow`

**Objective:** Allow authenticated users to enter a lobby and coordinate a start through sockets.

- Authenticate WebSocket upgrades from the session cookie and map user, socket, and room membership.
- Implement join, leave, ready/unready, host-only start request, ordered room snapshots/events, acknowledgements, and stable errors.
- Prevent duplicate active membership and input spoofing; define multiple-tab behavior (newest gameplay connection replaces the old connection, or secondary tabs spectate).
- Broadcast presence changes and clean up on explicit leave or confirmed connection loss.

**Done when:** multi-client integration tests exercise join/leave, all-ready gating, host permissions/transfer, duplicate commands, and disconnect cleanup.

### Phase C — Deterministic game core

#### Commit 8 — `feat(physics): generate polygon and duel arenas`

**Objective:** Represent every arena and paddle position with deterministic geometry.

- Generate clockwise regular polygons for 3–8 players with inward normals and stable side IDs.
- Generate the square duel with defended left/right boundaries and neutral top/bottom walls.
- Represent paddle position as a normalized scalar along its side; calculate equal 30% lengths, endpoint padding, and world-space segments.
- Provide fair serve-vector generation that excludes near-parallel and near-vertex trajectories.

**Done when:** unit/property tests prove equal side lengths, inward normals, bounded paddles, preserved player order, deterministic serves, and correct duel assignment.

#### Commit 9 — `feat(physics): implement fixed-step paddle and swept ball simulation`

**Objective:** Correctly resolve movement and all return types without tunneling.

- Integrate normalized paddle movement with equal speed and endpoint clamps.
- Implement swept circle-versus-segment/capsule tests for paddle faces and swept boundary intersections.
- Resolve earliest contact, remaining time, collision epsilon, separation bias, and collision-iteration cap.
- Implement paddle offset/movement influence, minimum inward angle, predictable speed increase, and speed cap.
- Resolve exact polygon vertices and duel wall corners as neutral contacts before miss handling.

**Done when:** deterministic tests cover center/end returns, moving paddles, high-speed tunneling, grazing hits, exact vertices, simultaneous contacts, duel walls/corners, and maximum speed.

#### Commit 10 — `feat(game): implement match and stage state machines`

**Objective:** Turn pure simulation into the complete ruleset lifecycle.

- Create randomized initial cyclic order and deterministic stage construction.
- Implement countdown, play, miss, one-player elimination, transition, recenter/reset, final duel, winner, forfeit, and no-contest flows.
- Track returns, rally length, survival time, elimination reason/order, and placement.
- Emit domain events and expose a serializable authoritative snapshot without socket or database dependencies.

**Done when:** fake-clock tests play scripted 2-, 3-, and 8-player matches through completion and verify placements, order preservation, resets, and no-contest cases.

### Phase D — Networked match

#### Commit 11 — `feat(server): run authoritative matches and broadcast snapshots`

**Objective:** Connect ready rooms to live server-owned simulation.

- Add a match manager and per-match fixed-timestep loop using monotonic time.
- Accept only direction input for the authenticated player's paddle; enforce sequence order, membership, lifecycle, and rate limits.
- Broadcast snapshots at the configured rate and reliable lifecycle events immediately.
- Stop timers and release room/match references after completion; bound matches, rooms, sockets, and inbound traffic to protect the process.

**Done when:** socket integration tests start a room, move paddles, observe countdown/snapshots, force a miss, transition stages, and finish without leaked timers.

#### Commit 12 — `feat(game): add reconnect, forfeit, and spectator behavior`

**Objective:** Make transient network failure conform to sections 11–14 of the rules.

- On connection loss, freeze that player's last authoritative paddle position and start a server grace deadline.
- Resume by authenticated user/match identity, send a full fresh snapshot, and invalidate the old connection.
- Let a normal miss beat a pending timeout; eliminate once on grace expiry; make voluntary leave immediate.
- Convert eliminated players to read-only spectators and reject their inputs.
- Declare no contest only when no valid winner can be determined.

**Done when:** fake-timer tests cover resume before expiry, expiry forfeit, miss-versus-timeout race, double connections, spectator input rejection, all-disconnected no contest, and sole-connected winner.

#### Commit 13 — `feat(results): persist match outcomes and statistics`

**Objective:** Retain final facts without putting SQLite in the simulation hot path.

- Insert match metadata at start and accumulate stats in memory.
- At completion/no-contest, write match, players, placements, stages, seeds, reasons, and statistics in one transaction.
- Make finalization idempotent so retries cannot duplicate placements.
- Add authorized result retrieval and basic recent-history endpoint for the current user.

**Done when:** integration tests compare persisted records to emitted final events and verify rollback/idempotency on an injected write failure.

### Phase E — Functional React client

#### Commit 14 — `feat(client): add authentication and application routing`

**Objective:** Replace the Vite demo with a minimal navigable application.

- Add routes for register, login, lobby, room, match, result, and not-found.
- Implement a typed REST client, session provider, loading/error states, protected routes, logout, and session restoration.
- Use plain semantic HTML forms with labels, keyboard support, visible errors, and no visual-design dependency.

**Done when:** UI tests cover registration/login errors, authenticated refresh, protected redirects, and logout.

#### Commit 15 — `feat(client): implement lobby and room screens`

**Objective:** Let users create, discover, join, ready, and start matches.

- Add a resilient WebSocket client with connection status, request acknowledgements, typed dispatch, and bounded reconnect backoff.
- Show public rooms, create/invite-code controls, members, host marker, ready state, errors, and start eligibility.
- Route all clients to the match screen on `match.started`; prevent accidental duplicate socket handlers on React remounts.

**Done when:** component/integration tests demonstrate two simulated users reaching a started match and recover the room snapshot after reconnect.

#### Commit 16 — `feat(client): render authoritative arenas and game state`

**Objective:** Display playable polygon and square-duel stages using Canvas graphics.

- Scale a fixed logical coordinate system responsively with device-pixel-ratio handling.
- Draw background, boundaries, neutral walls/corners, colored paddles, ball, player names/status, countdown, elimination notice, and winner.
- Interpolate server snapshots; keep simulation data out of React render state where practical.
- Add an optional debug overlay for tick, snapshot age, latency, stage, ball velocity, and connection status.

**Done when:** deterministic renderer tests or snapshots cover 2-, 3-, and 8-player states and manual resizing remains sharp and correctly proportioned.

#### Commit 17 — `feat(client): add controls, reconciliation, and spectating`

**Objective:** Make the game responsive while retaining server authority.

- Map Arrow/A-D keys to side-relative negative/positive movement; send changes on press/release rather than every animation frame.
- Clear held input on blur, visibility loss, unmount, disconnect, and elimination.
- Add local paddle prediction with gentle reconciliation, or retain direct authority rendering behind a flag for playtest comparison.
- Show reconnect grace status and disable controls for spectators/eliminated players.

**Done when:** tests verify opposing keys cancel, release sends stop, input is never sent for another player, stale inputs are ignored, and reconnect restores the correct role.

#### Commit 18 — `feat(client): add result history and playtest telemetry view`

**Objective:** Complete the user journey and expose information needed to validate the idea.

- Show winner, placement order, elimination reasons, returns, longest rally, and survival time.
- Add “return to lobby” and a minimal personal match-history page.
- Surface non-sensitive match ID/ruleset version so playtest bug reports can identify server logs and saved stage seeds.

**Done when:** completed and no-contest results render correctly after live completion and direct page refresh.

### Phase F — Hardening and prototype delivery

#### Commit 19 — `test(e2e): cover multiplayer critical paths`

**Objective:** Automate the risks that unit tests cannot expose.

- Add browser tests for two-user duel and three-user elimination-to-duel flow.
- Add test-only deterministic serve/control hooks guarded from production builds.
- Cover refresh/reconnect, voluntary leave, grace timeout, spectator view, and result persistence.
- Add server load smoke tests for several concurrent rooms and measure tick drift/event-loop lag.

**Done when:** critical E2E tests run reliably in CI and the agreed prototype concurrency target stays within tick-drift and latency budgets.

#### Commit 20 — `chore: add CI, production build, and operations documentation`

**Objective:** Make the prototype reproducible and safely deployable as one instance.

- Add CI for install, migrations, typecheck, lint, unit/integration tests, client build, and E2E smoke tests.
- Serve the built client from Express in production with SPA fallback; add a multi-stage Dockerfile and persistent SQLite volume documentation.
- Document secrets, reverse-proxy WebSocket upgrades, TLS, origin allowlist, backups, graceful shutdown, log fields, and recovery limitations.
- Add a manual playtest checklist mapped to every rule section and a short known-limitations document.

**Done when:** a clean machine can build, migrate, start, pass health checks, host a match, restart without losing accounts/results, and restore a backed-up database.

## 8. Testing strategy and high-risk cases

The physics library should receive the most exhaustive tests because a visually plausible collision can still violate elimination fairness. Prefer pure functions, seeded randomness, fake clocks, and recorded input scripts.

Minimum test matrix:

- Arenas for every supported player count, especially triangle geometry and 2-player wall/goal distinctions.
- Ball radius accounted for at every paddle, boundary, wall, and vertex contact.
- Multiple possible contacts within one tick; earliest wins and remaining time is simulated.
- Exact and near-exact vertices behave deterministically under floating-point tolerance.
- Serve filtering always terminates and never targets a forbidden angular band.
- Paddle endpoint contacts cannot produce an outward or nearly tangent return.
- Speed never exceeds the collision-safe cap.
- Only one elimination occurs when miss, disconnect timeout, and leave events race.
- Countdown ignores gameplay effects while retaining latest legal input for rally start.
- Survivor order and placement are correct for every elimination count.
- Stale/replayed inputs, guessed room IDs, expired sessions, oversized frames, and unauthorized start commands are harmless.
- Timers, sockets, rooms, and matches are released after close, failure, and shutdown.

## 9. Security and abuse baseline

Even a prototype should include the cheap protections that are painful to retrofit:

- Validate and cap every HTTP body and socket frame; use allowlists and discriminated schemas.
- Use parameterized database operations, password hashing, session expiry/revocation, secure production cookies, TLS, and an explicit origin allowlist.
- Rate-limit authentication, room creation/join, WebSocket messages, and reconnect attempts.
- Enforce identity and authorization at the service boundary, not only in route handlers.
- Never accept client time, coordinates, velocities, hits, misses, placement, or winner state.
- Avoid logging secrets and user passwords; escape usernames when rendered.
- Bound all in-memory collections and add idle expiry to prevent abandoned-room exhaustion.
- Return public error codes while logging internal causes with request, connection, room, and match correlation IDs.

## 10. Observability and playtest metrics

Log structured events for room creation/join/start, stage start, returns, misses, elimination, reconnect, forfeit, tick overruns, and match completion. Do not persist every snapshot.

Track at least:

- Concurrent connections, rooms, and matches.
- WebSocket round-trip time and disconnect/reconnect counts.
- Simulation tick duration, drift, dropped/late snapshots, and collision-iteration cap hits.
- Match duration, stage duration, rally returns, player count, miss side/contact location, and no-contest reason.
- Serve direction distribution and eliminations soon after countdown, to identify unfair opening shots.

The playtest decision should answer: Can players understand which side they own? Are returns predictable? Is latency tolerable? Are triangle and high-player-count arenas fair? Is the 30% paddle size appropriate? Does the final duel feel like a natural conclusion?

## 11. Suggested milestone gates

1. **Local physics sandbox (through commit 10):** Scripted complete matches work without networking or UI.
2. **Headless multiplayer (through commit 13):** WebSocket test clients complete and persist matches.
3. **Playable prototype (through commit 18):** Real users can complete the full browser journey.
4. **Shareable playtest build (through commit 20):** CI, E2E tests, deployment instructions, metrics, and recovery notes exist.

Do not tune game feel until collision correctness and instrumentation are in place. After the first playtests, adjust only versioned configuration values—paddle ratio, starting speed, acceleration, cap, and serve exclusion angles—so the core rules and protocol remain stable.
