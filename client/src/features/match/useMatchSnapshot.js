import { useSyncExternalStore, useCallback } from 'react'

export default function useMatchSnapshot(channel, matchId) {
  const getSnapshot = useCallback(() => {
    const snapshot = channel.getLatest('game.snapshot')?.payload
    if (snapshot?.matchId === matchId) return snapshot
    const started = channel.getLatest('match.started')?.payload
    return started?.matchId === matchId ? started : null
  }, [channel, matchId])
  return useSyncExternalStore(channel.subscribe, getSnapshot, () => null)
}
