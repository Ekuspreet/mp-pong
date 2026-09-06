import { Router } from 'express'
function healthRoutes(controller) {
  const router = Router()
  router.get('/live', controller.live)
  router.get('/ready', controller.ready)
  return router
}
export { healthRoutes }
