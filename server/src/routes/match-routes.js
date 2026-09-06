import { Router } from 'express'
function matchRoutes(controller, authenticate) {
  const router = Router()
  router.use(authenticate)
  router.get('/', controller.history)
  router.get('/:id', controller.get)
  return router
}
export { matchRoutes }
