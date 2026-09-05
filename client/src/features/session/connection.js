import { createContext, useContext, useSyncExternalStore } from 'react'

export const ConnectionContext = createContext(null)

export function useGameChannel() {
  const channel = useContext(ConnectionContext)
  if (!channel) throw new Error('GameConnectionProvider is required')
  return channel
}

export function useConnectionStatus() {
  const channel = useGameChannel()
  return useSyncExternalStore(
    channel.subscribeStatus,
    channel.getStatus,
    channel.getStatus,
  )
}
