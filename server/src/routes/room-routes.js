import { Router } from 'express'
function roomRoutes(controller, authenticate) {
  const router = Router()
  router.use(authenticate)
  router.get('/', controller.list)
  router.post('/', controller.create)
  router.get('/:id', controller.get)
  return router
}
export { roomRoutes }
