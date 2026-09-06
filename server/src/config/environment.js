import { z } from 'zod'
const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3e3),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_PATH: z.string().default('./data/polygon-pong.sqlite'),
  SESSION_DAYS: z.coerce.number().positive().default(7),
  LOG_LEVEL: z.string().default('info'),
  LOG_PATH: z.string().default('./logs/server.log'),
})
function loadConfig(env = process.env) {
  return schema.parse(env)
}
export { loadConfig }
