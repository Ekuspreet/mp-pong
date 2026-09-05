import { useParams } from 'react-router-dom'
import { useSession } from '../session/session.js'
import { useGameChannel, useConnectionStatus } from '../session/connection.js'
import useMatchSnapshot from './useMatchSnapshot.js'
import useMatchControls from './useMatchControls.js'
import MatchView from './MatchView.jsx'

export default function MatchPage() {
  const { id } = useParams()
  const { user } = useSession()
  const channel = useGameChannel()
  const status = useConnectionStatus()
  const snapshot = useMatchSnapshot(channel, id)
  useMatchControls(channel, status)
  return (
    <MatchView id={id} status={status} snapshot={snapshot} userId={user.id} />
  )
}
