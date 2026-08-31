import { createServer } from 'node:http'
import { loadConfig } from './config.js'
import { openDatabase } from './db.js'
import { createApp } from './app.js'
import { AuthService } from './auth.js'
import { RoomRegistry } from './rooms.js'
import { MatchManager } from './matches.js'
import { attachWebSockets } from './ws.js'

const config = loadConfig(), db = openDatabase(config.DATABASE_PATH), auth = new AuthService(db, config.SESSION_DAYS, config.NODE_ENV === 'production'), rooms = new RoomRegistry(), matches = new MatchManager(db)
const app = createApp(config, db, { auth, rooms, matches }), server = createServer(app), wss = attachWebSockets(server, auth, rooms, matches)
server.listen(config.PORT, () => console.log(`Polygon Pong listening on http://localhost:${config.PORT}`))
const shutdown = () => { matches.close(); wss.close(); server.close(() => { db.close(); process.exit(0) }); setTimeout(() => process.exit(1), 5_000).unref() }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown)
