import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/OQUE.png'
import pongLogo from '../../assets/logo.png'
import { Button } from '../../design-system/Button/index.js'
import GameCanvas from './GameCanvas.jsx'

function MatchTimer({ snapshot }) {
  const [now, setNow] = useState(snapshot.serverTime)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])
  const remaining = snapshot?.phaseEndsAt
    ? Math.max(0, snapshot.phaseEndsAt - now)
    : 0
  const elapsed = snapshot?.startedAt
    ? Math.max(0, now - snapshot.startedAt)
    : 0
  const value =
    snapshot?.phase === 'countdown'
      ? Math.ceil(remaining / 1000).toString()
      : `${String(Math.floor(elapsed / 60000)).padStart(2, '0')}:${String(
          Math.floor(elapsed / 1000) % 60,
        ).padStart(2, '0')}`
  return <strong className="arena-timer__value">{value}</strong>
}

function PlayerList({ players, userId, format }) {
  return (
    <ol className="arena-player-list">
      {players.map((player) => (
        <li key={player.id} data-status={player.status}>
          <span className="arena-player-list__identity">
            <span>
              {player.username}
              {player.id === userId ? ' (you)' : ''}
            </span>
            <small>{player.status}</small>
          </span>
          {format === 'best_score' && (
            <strong className="arena-player-list__score">
              {player.score ?? 0} misses
            </strong>
          )}
          {format === 'stocks' && (
            <span
              className="arena-player-list__energy"
              role="img"
              aria-label={`${player.lives ?? 0} of 3 lives`}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <i
                  key={index}
                  className={
                    index < Math.round((player.lives ?? 0) * 2)
                      ? 'is-filled'
                      : ''
                  }
                />
              ))}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

function eventTime(serverTime) {
  if (!serverTime) return '--:--:--'
  return new Date(serverTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function MatchLog({ snapshot }) {
  const previous = useRef(null)
  const [events, setEvents] = useState([])

  useEffect(() => {
    const before = previous.current
    const additions = []
    const record = (message) =>
      additions.push({
        id: `${snapshot.tick}-${additions.length}-${message}`,
        time: eventTime(snapshot.serverTime),
        message,
      })

    if (!before) {
      record('Room telemetry opened')
      snapshot.players.forEach((player) =>
        record(`${player.username} entered the match`),
      )
      record(`Round ${snapshot.stage} initialized`)
      record(`Phase changed to ${snapshot.phase.replace('_', ' ')}`)
      if (snapshot.phase === 'complete' || snapshot.phase === 'no_contest') {
        const winner = snapshot.players.find(
          (player) => player.id === snapshot.winnerId,
        )
        record(winner ? `${winner.username} won the match` : 'Match ended')
        snapshot.players
          .slice()
          .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
          .forEach((player) =>
            record(
              `Position ${player.placement ?? '—'} · ${player.username} · ${player.returns} returns`,
            ),
          )
      }
    } else {
      if (snapshot.stage !== before.stage)
        record(`Round ${snapshot.stage} initialized`)
      if (snapshot.phase !== before.phase)
        record(`Phase changed to ${snapshot.phase.replace('_', ' ')}`)

      snapshot.players.forEach((player) => {
        const prior = before.players.find((item) => item.id === player.id)
        if (!prior) {
          record(`${player.username} entered the match`)
          return
        }
        if (player.status !== prior.status) {
          if (player.eliminationReason === 'forfeit')
            record(`${player.username} left the match`)
          else if (player.eliminationReason === 'miss')
            record(`${player.username} missed the ball`)
          else record(`${player.username} is ${player.status}`)
        }
      })

      before.players
        .filter(
          (player) =>
            !snapshot.players.some((current) => current.id === player.id),
        )
        .forEach((player) => record(`${player.username} left the room`))

      const finished =
        snapshot.phase === 'complete' || snapshot.phase === 'no_contest'
      const wasFinished =
        before.phase === 'complete' || before.phase === 'no_contest'
      if (finished && !wasFinished) {
        const winner = snapshot.players.find(
          (player) => player.id === snapshot.winnerId,
        )
        record(winner ? `${winner.username} won the match` : 'Match ended')
        snapshot.players
          .slice()
          .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
          .forEach((player) =>
            record(
              `Position ${player.placement ?? '—'} · ${player.username} · ${player.returns} returns`,
            ),
          )
      }
    }

    previous.current = snapshot
    if (additions.length)
      // Snapshot updates are external events accumulated into a persistent log.
      // oxlint-disable-next-line react/set-state-in-effect
      setEvents((current) => [...current, ...additions].slice(-120))
  }, [snapshot])

  return (
    <section className="arena-panel arena-log" aria-label="Room event log">
      <h2>Room log</h2>
      <ol aria-live="polite">
        {events.map((event) => (
          <li key={event.id}>
            <time>{event.time}</time>
            <span>{event.message}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Results({ snapshot, userId, error, onRestart, onLobby, onLeave }) {
  const placements = snapshot.players
    .slice()
    .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
  const winner = placements[0]
  const isHost = snapshot.hostId === userId
  return (
    <section className="arena-results" aria-label="Match results">
      <section className="arena-results__summary">
        <span>Winner</span>
        <strong>{winner?.username ?? 'No contest'}</strong>
        <small>
          {snapshot.phase === 'no_contest'
            ? 'Match ended before a winner was decided'
            : `Round ${snapshot.stage} complete`}
        </small>
      </section>
      <ol className="arena-results__placements">
        {placements.map((player) => (
          <li key={player.id}>
            <span>#{player.placement ?? '-'}</span>
            <strong>{player.username}</strong>
            <small>{player.returns} returns</small>
          </li>
        ))}
      </ol>
      <section className="arena-results__stats">
        <p>
          Longest rally <strong>{snapshot.longestRally}</strong>
        </p>
        <p>
          Rounds played <strong>{snapshot.stage}</strong>
        </p>
        <p>
          Total returns{' '}
          <strong>{placements.reduce((sum, p) => sum + p.returns, 0)}</strong>
        </p>
      </section>
      {error && (
        <p className="arena-error" role="alert">
          {error}
        </p>
      )}
      <div className="arena-results__actions">
        {isHost ? (
          <>
            <Button onClick={onRestart}>Restart</Button>
            <Button variant="secondary" onClick={onLobby}>
              Send to lobby
            </Button>
          </>
        ) : (
          <>
            <p>Waiting for the room owner…</p>
            <Button variant="ghost" onClick={onLeave}>
              Leave room
            </Button>
          </>
        )}
      </div>
    </section>
  )
}

export default function MatchView(props) {
  const { snapshot, userId, status, error, onLeave } = props
  const shellRef = useRef(null)
  const moveCockpit = (event) => {
    const shell = shellRef.current
    if (!shell) return
    const bounds = shell.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    shell.style.setProperty('--cockpit-yaw', `${x * 1.4}deg`)
    shell.style.setProperty('--cockpit-pitch', `${y * -0.8}deg`)
  }
  const resetCockpit = () => {
    shellRef.current?.style.setProperty('--cockpit-yaw', '0deg')
    shellRef.current?.style.setProperty('--cockpit-pitch', '0deg')
  }
  if (!snapshot)
    return (
      <main className="arena-loading">
        <p>Connecting to arena…</p>
      </main>
    )
  const isFinished =
    snapshot.phase === 'complete' || snapshot.phase === 'no_contest'
  return (
    <main
      ref={shellRef}
      className={`arena-shell${isFinished ? ' arena-shell--results' : ''}`}
      onPointerMove={moveCockpit}
      onPointerLeave={resetCockpit}
    >
      <div className="cockpit-frame" aria-hidden="true">
        <span className="cockpit-frame__round">Round {snapshot.stage}</span>
        <div className="cockpit-frame__console" />
      </div>
      <div
        className="cockpit-link"
        data-status={status}
        role="status"
        aria-label={`Connection ${status}`}
      >
        <span>Link</span>
        <i />
        <i />
        <i />
        <i />
      </div>
      <aside className="arena-sidebar arena-sidebar--left">
        <section className="arena-panel arena-logo">
          <img className="arena-logo__oque" src={logo} alt="OQUE" />
          <span className="arena-logo__divider" aria-hidden="true" />
          <img className="arena-logo__pong" src={pongLogo} alt="Pong" />
        </section>
        <section className="arena-panel arena-timer">
          <span>Match time</span>
          <MatchTimer snapshot={snapshot} />
        </section>
        <MatchLog snapshot={snapshot} />
      </aside>
      <section className="arena-playfield">
        <GameCanvas snapshot={snapshot} userId={userId} />
        {(snapshot.phase === 'countdown' ||
          snapshot.phase === 'transition') && (
          <div className="arena-countdown">
            <MatchTimer snapshot={snapshot} />
          </div>
        )}
        {isFinished && <Results {...props} />}
      </section>
      <aside className="arena-sidebar arena-sidebar--right">
        <section className="arena-panel arena-players">
          <h2>Players</h2>
          <PlayerList
            players={snapshot.players}
            userId={userId}
            format={snapshot.format}
          />
        </section>
      </aside>
      <section className="arena-panel arena-controls cockpit-instructions">
        <h2>Pilot instructions</h2>
        <p>
          <kbd>A</kbd> / <kbd>←</kbd> Bank left
        </p>
        <Button variant="ghost" onClick={onLeave}>
          Exit cockpit
        </Button>
        <p>
          <kbd>D</kbd> / <kbd>→</kbd> Bank right
        </p>
      </section>
      {error && (
        <p className="arena-error" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
