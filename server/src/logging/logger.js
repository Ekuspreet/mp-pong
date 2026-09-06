import pino from 'pino'

export function createLogger(config) {
  if (config.NODE_ENV === 'test') return pino({ enabled: false })

  const file = pino.destination({
    dest: config.LOG_PATH,
    mkdir: true,
    append: false,
    sync: true,
  })
  const stderr = pino.destination({ dest: 2, sync: true })

  return pino(
    {
      level: config.LOG_LEVEL,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    pino.multistream([
      { level: 'trace', stream: file },
      { level: 'error', stream: stderr },
    ]),
  )
}
