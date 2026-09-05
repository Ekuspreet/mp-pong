import { Badge } from '../../design-system/Badge/index.js'

export default function CrewList({ members, userId }) {
  return (
    <div className="crew-list">
      {members.length ? (
        <ol>
          {members.map((item, index) => (
            <li
              key={item.id}
              className={
                item.id === userId
                  ? 'crew-list__member crew-list__member--you'
                  : 'crew-list__member'
              }
            >
              <span className="crew-list__number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <strong>{item.username}</strong>
                <small>
                  {item.host ? 'Host' : item.id === userId ? 'You' : 'Pilot'}
                </small>
              </div>
              <Badge
                tone={item.ready ? 'yellow' : item.connected ? 'teal' : 'red'}
              >
                {item.ready ? 'Ready' : item.connected ? 'Standby' : 'Offline'}
              </Badge>
            </li>
          ))}
        </ol>
      ) : (
        <div className="deck-empty">
          <strong>Opening channel…</strong>
          <span>Waiting for the room manifest.</span>
        </div>
      )}
    </div>
  )
}
