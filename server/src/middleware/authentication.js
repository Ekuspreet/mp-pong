import { createAppError } from '../errors/app-error.js'
function requireUser(sessions) {
  return (request, response, next) => {
    const user = sessions.userFromCookie(request.headers.cookie)
    if (!user) throw createAppError('UNAUTHENTICATED', 'Sign in required', 401)
    response.locals.user = user
    next()
  }
}
function userOf(response) {
  const user = response.locals.user
  if (!user) throw createAppError('UNAUTHENTICATED', 'Sign in required', 401)
  return user
}
export { requireUser, userOf }
