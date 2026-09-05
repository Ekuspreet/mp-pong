import { useCallback, useEffect, useRef, useState } from 'react'
import { useServices } from '../../app/services.js'

import { SessionContext } from './session.js'

export function SessionProvider({ children }) {
  const { session } = useServices()
  const [user, updateUser] = useState(undefined)
  const revision = useRef(0)
  const setUser = useCallback((nextUser) => {
    revision.current += 1
    updateUser(nextUser)
  }, [])

  useEffect(() => {
    let active = true
    const initialRevision = revision.current
    const restore = (restoredUser) => {
      // A slow bootstrap response must not overwrite a newer login/logout.
      if (active && revision.current === initialRevision)
        updateUser(restoredUser)
    }
    session
      .current()
      .then(restore)
      .catch(() => restore(null))
    return () => {
      active = false
    }
  }, [session])

  const logout = async () => {
    await session.logout()
    setUser(null)
  }

  return (
    <SessionContext.Provider value={{ user, setUser, logout }}>
      {children}
    </SessionContext.Provider>
  )
}
