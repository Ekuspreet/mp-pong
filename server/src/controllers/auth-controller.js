import { userOf } from '../middleware/authentication.js'

export function createAuthController(auth, cookies) {
  const register = async (request, response) => {
    const user = await auth.register(
      String(request.body?.username ?? ''),
      String(request.body?.password ?? ''),
    )
    response.setHeader('Set-Cookie', cookies.create(user.id))
    response.status(201).json({ user })
  }
  const login = async (request, response) => {
    const user = await auth.login(
      String(request.body?.username ?? ''),
      String(request.body?.password ?? ''),
    )
    response.setHeader('Set-Cookie', cookies.create(user.id))
    response.json({ user })
  }
  const guest = (request, response) => {
    const user = auth.createGuest(
      request.body?.username === undefined
        ? undefined
        : String(request.body.username),
    )
    response.setHeader('Set-Cookie', cookies.create(user.id))
    response.status(201).json({ user })
  }
  const logout = (request, response) => {
    response.setHeader('Set-Cookie', cookies.clear(request.headers.cookie))
    response.status(204).end()
  }
  const me = (_request, response) => response.json({ user: userOf(response) })
  return { register, login, guest, logout, me }
}
