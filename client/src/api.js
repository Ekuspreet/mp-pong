import { apiFactory } from './config/apiFactory.js'
import { GameSocket as SocketTransport } from './services/GameSocket.js'

export async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (response.status === 204) return null
  const body = await response.json()
  if (!response.ok)
    throw new Error(
      body.error?.message ?? `Request failed (${response.status})`,
    )
  return body
}
// Compatibility adapter: endpoint configuration stays outside the transport.
export class GameSocket extends SocketTransport {
  constructor(onMessage, onStatus) {
    super(apiFactory.socket, onMessage, onStatus)
  }
}
