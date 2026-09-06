import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../session/session.js'
import { useGameChannel, useConnectionStatus } from '../session/connection.js'
import useMatchSnapshot from './useMatchSnapshot.js'
import useMatchControls from './useMatchControls.js'
import MatchView from './MatchView.jsx'

export default function MatchPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const channel = useGameChannel()
  const status = useConnectionStatus()
  const snapshot = useMatchSnapshot(channel, id)
  const [error, setError] = useState('')
  useMatchControls(channel, status, snapshot, user.id)

  useEffect(() => {
    if (status !== 'connected') return
    let active = true
    channel.send('match.join', { matchId: id }).catch(() => {
      if (active) navigate('/lobby', { replace: true })
    })
    return () => {
      active = false
    }
  }, [channel, id, navigate, status])

  useEffect(
    () =>
      channel.subscribe((message) => {
        if (message.type === 'match.started' && message.payload.matchId !== id)
          navigate(`/matches/${message.payload.matchId}`, { replace: true })
        if (
          message.type === 'room.snapshot' &&
          message.payload.status === 'open'
        )
          navigate(`/rooms/${message.payload.id}`)
      }),
    [channel, id, navigate],
  )

  const send = useCallback(
    async (type) => {
      setError('')
      try {
        await channel.send(type, {})
        return true
      } catch (failure) {
        setError(failure.message)
        return false
      }
    },
    [channel],
  )
  return (
    <MatchView
      id={id}
      status={status}
      snapshot={snapshot}
      userId={user.id}
      error={error}
      onRestart={() => send('room.restart')}
      onLobby={() => send('room.lobby')}
      onLeave={async () => {
        if (await send('room.leave')) navigate('/lobby')
      }}
    />
  )
}
