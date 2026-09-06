import { useEffect, useState } from 'react'
import { useGameChannel, useConnectionStatus } from '../session/connection.js'
import { selectRoomState } from './roomSelectors.js'

export default function useRoom(id, userId, onMatchStarted, onLeave) {
  const channel = useGameChannel()
  const status = useConnectionStatus()
  const [room, setRoom] = useState(null)
  const [error, setError] = useState('')

  useEffect(
    () =>
      channel.subscribe((message) => {
        if (
          message.type === 'room.snapshot' &&
          (message.payload.id === id || message.payload.code === id)
        ) {
          setRoom(message.payload)
        }
        if (message.type === 'match.started')
          onMatchStarted(message.payload.matchId)
        if (message.type === 'error') setError(message.payload.message)
      }),
    [channel, id, onMatchStarted],
  )

  useEffect(() => {
    if (status !== 'connected') return
    let active = true
    channel.send('room.join', { roomId: id }).catch((failure) => {
      if (!active) return
      if (['ROOM_CLOSED', 'ROOM_NOT_FOUND'].includes(failure.code)) {
        onLeave()
        return
      }
      setError(failure.message)
    })
    return () => {
      active = false
    }
  }, [channel, status, id, onLeave])

  const state = selectRoomState(room, userId)
  async function command(type, payload) {
    setError('')
    try {
      await channel.send(type, payload)
      return true
    } catch (failure) {
      setError(failure.message)
      return false
    }
  }
  return {
    ...state,
    room,
    error,
    status,
    ready: () => command('room.ready', { ready: !state.member?.ready }),
    start: () => command('room.start'),
    leave: async () => {
      if (await command('room.leave')) onLeave()
    },
  }
}
