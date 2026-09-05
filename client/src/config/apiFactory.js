const withoutTrailingSlash = (value, name) => {
  if (!value) throw new Error(`${name} is not configured`)
  return value.replace(/\/+$/, '')
}

const apiBaseUrl = withoutTrailingSlash(import.meta.env.VITE_API_BASE_URL, 'VITE_API_BASE_URL')
const wsBaseUrl = withoutTrailingSlash(import.meta.env.VITE_WS_BASE_URL, 'VITE_WS_BASE_URL')
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
