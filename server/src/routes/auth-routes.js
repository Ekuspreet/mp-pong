import { Router } from 'express'
function authRoutes(controller, authenticate) {
  const router = Router()
  router.post('/register', controller.register)
  router.post('/login', controller.login)
  router.post('/guest', controller.guest)
  router.post('/logout', controller.logout)
  router.get('/me', authenticate, controller.me)
  return router
}
export { authRoutes }
