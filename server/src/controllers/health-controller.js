export function createHealthController(healthCheck) {
  return {
    live: (_request, response) => response.json({ status: 'ok' }),
    ready: (_request, response) => {
      healthCheck()
      response.json({ status: 'ready' })
    },
  }
}
