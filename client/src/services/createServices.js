/** Application-facing ports. Transport details stay outside feature components. */
export function createServices(request, endpoints, createConnection) {
  const post = (url, body) =>
    request(url, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  return {
    session: {
      current: () => request(endpoints.auth.me).then((body) => body.user),
      guest: (credentials) =>
        post(endpoints.auth.guest, credentials).then((body) => body.user),
      login: (credentials) =>
        post(endpoints.auth.login, credentials).then((body) => body.user),
      register: (credentials) =>
        post(endpoints.auth.register, credentials).then((body) => body.user),
      logout: () => post(endpoints.auth.logout),
    },
    rooms: {
      create: (options) =>
        post(endpoints.rooms.all, { visibility: 'public', options }).then(
          (body) => body.room,
        ),
    },
    history: {
      list: () => request(endpoints.matches.all).then((body) => body.matches),
    },
    createConnection,
  }
}
