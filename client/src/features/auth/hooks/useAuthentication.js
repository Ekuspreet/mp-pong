import { useState } from 'react'
import { useServices } from '../../../app/services.js'
import { useSession } from '../../session/session.js'

/** Coordinates authentication; forms own their fields and pages own navigation. */
export default function useAuthentication(onSuccess) {
  const { session } = useServices()
  const { setUser } = useSession()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function authenticate(method, credentials) {
    setError('')
    setLoading(true)
    try {
      const user = await session[method](credentials)
      setUser(user)
      onSuccess()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }
  return { error, setError, loading, authenticate }
}
