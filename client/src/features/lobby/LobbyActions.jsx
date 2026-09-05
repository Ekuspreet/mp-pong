import { Badge } from '../../design-system/Badge/index.js'
import { Button } from '../../design-system/Button/index.js'
import JoinRoomForm from './JoinRoomForm.jsx'

export default function LobbyActions({ error, creating, onCreate, onJoin }) {
  return (
    <div className="deck-actions lobby-actions">
      {error && (
        <p className="identity-card__error" role="alert">
          {error}
        </p>
      )}
      <section>
        <Badge tone="yellow">Create a room</Badge>
        <p>Launch a room using the game configuration selected on the right.</p>
        <Button onClick={onCreate} disabled={creating}>
          Create room <span aria-hidden="true">→</span>
        </Button>
      </section>
      <div className="identity-card__divider">
        <span>or join</span>
      </div>
      <JoinRoomForm onJoin={onJoin} />
    </div>
  )
}
