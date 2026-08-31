import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_PATH: z.string().default('./data/polygon-pong.sqlite'),
  SESSION_DAYS: z.coerce.number().positive().default(7),
  LOG_LEVEL: z.string().default('info'),
})
export type Config = z.infer<typeof schema>
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config { return schema.parse(env) }
