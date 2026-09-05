/** Owns one connection and broadcasts every event without React batching losses. */
export function createGameChannel(createConnection) {
  let connection = null
  let generation = 0
  let status = 'disconnected'
  const listeners = new Set()
  const statusListeners = new Set()
  const latest = new Map()
  const publishStatus = (next) => {
    status = next
    statusListeners.forEach((listener) => listener())
  }
  const stop = () => {
    generation += 1
    connection?.close()
    connection = null
    latest.clear()
    publishStatus('disconnected')
  }
  return {
    start() {
      if (connection) return
      const current = ++generation
      connection = createConnection(
        (message) => {
          if (generation !== current) return
          latest.set(message.type, message)
          listeners.forEach((listener) => listener(message))
        },
        (next) => {
          if (generation === current) publishStatus(next)
        },
      )
    },
    stop,
    send(type, payload = {}) {
      return connection
        ? connection.send(type, payload)
        : Promise.reject(new Error('Socket is not connected'))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    subscribeStatus(listener) {
      statusListeners.add(listener)
      return () => statusListeners.delete(listener)
    },
    getStatus: () => status,
    getLatest: (type) => latest.get(type),
  }
}
