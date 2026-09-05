import { useEffect, useMemo } from 'react'
import { useServices } from '../../app/services.js'
import { createGameChannel } from '../../services/createGameChannel.js'
import { useSession } from './session.js'

import { ConnectionContext } from './connection.js'

export function GameConnectionProvider({ children }) {
  const { user } = useSession()
  const { createConnection } = useServices()
  const userId = user?.id
  // Each identity gets a separate channel so cached events cannot cross sessions.
  const channel = useMemo(
    () => ({ ...createGameChannel(createConnection), userId }),
    [createConnection, userId],
  )
  useEffect(() => {
    if (userId) channel.start()
    return () => channel.stop()
  }, [channel, userId])
  return (
    <ConnectionContext.Provider value={channel}>
      {children}
    </ConnectionContext.Provider>
  )
}
