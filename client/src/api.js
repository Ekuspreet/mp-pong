export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  if (response.status === 204) return null
  const body = await response.json()
  if (!response.ok) throw new Error(body.error?.message ?? `Request failed (${response.status})`)
  return body
}
export class GameSocket {
  constructor(onMessage, onStatus) { this.onMessage = onMessage; this.onStatus = onStatus; this.requests = new Map(); this.attempt = 0; this.closed = false; this.connect() }
  connect() { const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'; this.socket = new WebSocket(`${protocol}//${location.host}/ws`); this.socket.onopen = () => { this.attempt = 0; this.onStatus('connected') }; this.socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (message.requestId && this.requests.has(message.requestId)) { const request = this.requests.get(message.requestId); this.requests.delete(message.requestId); if (message.type === 'error') request.reject(new Error(message.payload.message)); else request.resolve(message) } this.onMessage(message) }; this.socket.onclose = () => { this.onStatus('disconnected'); if (!this.closed) setTimeout(() => this.connect(), Math.min(500 * 2 ** this.attempt++, 5000)) } }
  send(type, payload = {}) { if (this.socket?.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Socket is not connected')); const requestId = crypto.randomUUID(); this.socket.send(JSON.stringify({ type, requestId, payload })); return new Promise((resolve, reject) => { this.requests.set(requestId, { resolve, reject }); setTimeout(() => { if (this.requests.delete(requestId)) reject(new Error('Server did not acknowledge the command')) }, 5000) }) }
  close() { this.closed = true; this.socket?.close() }
}
