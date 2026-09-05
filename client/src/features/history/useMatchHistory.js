import { useEffect, useState } from 'react'
import { useServices } from '../../app/services.js'

export default function useMatchHistory() {
  const { history } = useServices()
  const [state, setState] = useState({ matches: [], loading: true, error: '' })
  useEffect(() => {
    let active = true
    history
      .list()
      .then((matches) => {
        if (active) setState({ matches, loading: false, error: '' })
      })
      .catch((failure) => {
        if (active)
          setState({ matches: [], loading: false, error: failure.message })
      })
    return () => {
      active = false
    }
  }, [history])
  return state
}
