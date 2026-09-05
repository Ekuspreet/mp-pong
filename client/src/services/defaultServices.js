import { api, GameSocket } from '../api.js'
import { apiFactory } from '../config/apiFactory.js'
import { createServices } from './createServices.js'

export const defaultServices = createServices(
  api,
  apiFactory,
  (onMessage, onStatus) => new GameSocket(onMessage, onStatus),
)
