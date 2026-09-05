/** WebSocket transport: connection/retry and request acknowledgement lifecycle only. */
export class GameSocket {
  constructor(url, onMessage, onStatus, Socket = WebSocket) {
    this.url = url
    this.Socket = Socket
    this.onMessage = onMessage
    this.onStatus = onStatus
    this.requests = new Map()
    this.attempt = 0
    this.closed = false
    this.retryTimer = null
    this.connect()
  }

  connect() {
    if (this.closed) return
    const socket = new this.Socket(this.url)
    this.socket = socket
    socket.onopen = () => {
      if (this.closed) return
      this.attempt = 0
      this.onStatus('connected')
    }
    socket.onmessage = ({ data }) => {
      if (this.closed) return
      let message
      try {
        message = JSON.parse(data)
      } catch {
        return
      }
      const request = this.requests.get(message.requestId)
      if (request) {
        clearTimeout(request.timer)
        this.requests.delete(message.requestId)
        if (message.type === 'error')
          request.reject(new Error(message.payload.message))
        else request.resolve(message)
      }
      this.onMessage(message)
    }
    socket.onclose = () => {
      this.rejectPending('Socket is disconnected')
      if (this.closed) return
      this.onStatus('disconnected')
      this.retryTimer = setTimeout(
        () => this.connect(),
        Math.min(500 * 2 ** this.attempt++, 5000),
      )
    }
  }

  send(type, payload = {}) {
    if (this.closed || this.socket?.readyState !== this.Socket.OPEN) {
      return Promise.reject(new Error('Socket is not connected'))
    }
    const requestId = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.requests.delete(requestId)
        reject(new Error('Server did not acknowledge the command'))
      }, 5000)
      this.requests.set(requestId, { resolve, reject, timer })
      try {
        this.socket.send(JSON.stringify({ type, requestId, payload }))
      } catch (error) {
        clearTimeout(timer)
        this.requests.delete(requestId)
        reject(error)
      }
    })
  }

  rejectPending(message) {
    this.requests.forEach(({ reject, timer }) => {
      clearTimeout(timer)
      reject(new Error(message))
    })
    this.requests.clear()
  }

  close() {
    this.closed = true
    clearTimeout(this.retryTimer)
    this.rejectPending('Socket is closed')
    this.socket?.close()
  }
}
