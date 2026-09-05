import { useCallback } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import DeckPage from '../app-shell/DeckPage.jsx'
import { useSession } from '../session/session.js'
import useRoom from './useRoom.js'
import RoomConsole from './RoomConsole.jsx'
import CrewList from './CrewList.jsx'

function RoomController({ id }) {
  const navigate = useNavigate()
  const { user } = useSession()
  const onMatchStarted = useCallback(
    (matchId) => navigate(`/matches/${matchId}`),
    [navigate],
  )
  const room = useRoom(id, user.id, onMatchStarted, () => navigate('/lobby'))
  return (
    <DeckPage
      className="room-deck"
      leftTitle="Inside room"
      rightTitle={`Players ${room.members.length}/8`}
      left={
        <RoomConsole
          code={room.room?.code ?? id}
          error={room.error}
          status={room.status}
          member={room.member}
          canStart={room.canStart}
          onReady={room.ready}
          onStart={room.start}
          onLeave={room.leave}
        />
      }
      right={<CrewList members={room.members} userId={user.id} />}
    />
  )
}

export default function RoomPage() {
  const { id } = useParams()
  const code = id.trim().toUpperCase()
  if (id !== code) return <Navigate to={`/rooms/${code}`} replace />
  return <RoomController key={code} id={code} />
}
