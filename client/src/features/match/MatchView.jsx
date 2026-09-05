import { Link } from 'react-router-dom'
import GameCanvas from './GameCanvas.jsx'

export default function MatchView({ id, status, snapshot, userId }) {
  const me = snapshot?.players.find((player) => player.id === userId)
  return (
    <main>
      <h1>Match {id}</h1>
      <p>
        Connection: {status} | Phase: {snapshot?.phase ?? 'waiting'} | Stage:{' '}
        {snapshot?.stage ?? '-'}
      </p>
      {snapshot?.phase === 'countdown' && <p>Countdown active</p>}
      <GameCanvas snapshot={snapshot} />
      <p>Controls: arrows or WASD. You are {me?.status ?? 'connecting'}.</p>
      <ol>
        {snapshot?.players
          .slice()
          .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
          .map((p) => (
            <li key={p.id}>
              {p.username}: {p.status}, returns {p.returns}
              {p.placement ? `, place ${p.placement}` : ''}
            </li>
          ))}
      </ol>
      {snapshot?.winnerId && (
        <p>
          <strong>
            Winner:{' '}
            {snapshot.players.find((p) => p.id === snapshot.winnerId)?.username}
          </strong>
        </p>
      )}
      <Link to="/lobby">Return to lobby</Link>
    </main>
  )
}
