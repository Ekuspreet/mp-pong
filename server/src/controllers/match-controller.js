import { createAppError } from '../errors/app-error.js'
import { userOf } from '../middleware/authentication.js'

export function createMatchController(matches) {
  return {
    history: (_request, response) =>
      response.json({ matches: matches.history(userOf(response).id) }),
    get: (request, response) => {
      const result = matches.result(
        String(request.params.id),
        userOf(response).id,
      )
      if (!result)
        throw createAppError('MATCH_NOT_FOUND', 'Match not found', 404)
      response.json(result)
    },
  }
}
