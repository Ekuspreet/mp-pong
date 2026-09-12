const withoutTrailingSlash = (value) => value?.replace(/\/+$/, '')

// Falls back to the page's own origin so a build isn't tied to one deploy
// domain: only set VITE_API_BASE_URL/VITE_WS_BASE_URL when the client is
// served from a different origin than the API (e.g. local dev).
const apiBaseUrl = withoutTrailingSlash(import.meta.env.VITE_API_BASE_URL) ?? '/api'
const wsBaseUrl =
  withoutTrailingSlash(import.meta.env.VITE_WS_BASE_URL) ??
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
const endpoint = (path) => `${apiBaseUrl}${path}`

export const apiFactory = {
  auth: {
    register: endpoint('/auth/register'),
    login: endpoint('/auth/login'),
    guest: endpoint('/auth/guest'),
    logout: endpoint('/auth/logout'),
    me: endpoint('/auth/me'),
  },
  rooms: {
    all: endpoint('/rooms'),
    byId: (id) => endpoint(`/rooms/${encodeURIComponent(id)}`),
  },
  matches: {
    all: endpoint('/matches'),
    byId: (id) => endpoint(`/matches/${encodeURIComponent(id)}`),
  },
  socket: wsBaseUrl,
}
