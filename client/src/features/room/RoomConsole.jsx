import { Badge } from '../../design-system/Badge/index.js'
import { Button } from '../../design-system/Button/index.js'

export default function RoomConsole({
  code,
  error,
  status,
  member,
  canStart,
  onReady,
  onStart,
  onLeave,
}) {
  return (
    <div className="room-console">
      {error && (
        <p className="identity-card__error" role="alert">
          {error}
        </p>
      )}
      <Badge tone={status === 'connected' ? 'teal' : 'red'}>{status}</Badge>
      <div className="room-code">
        <span>Room code</span>
        <strong>{code}</strong>
        <small>Share this code with your crew</small>
      </div>
      <div className="room-console__actions">
        <Button disabled={status !== 'connected'} onClick={onReady}>
          {member?.ready ? 'Stand down' : 'Ready up'}
        </Button>
        <Button variant="secondary" disabled={!canStart} onClick={onStart}>
          Start game
        </Button>
        <Button variant="ghost" onClick={onLeave}>
          Leave room
        </Button>
      </div>
      {member?.host && !canStart && (
        <p className="deck-note">
          The host can launch when at least two pilots are ready.
        </p>
      )}
    </div>
  )
}
