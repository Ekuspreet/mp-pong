export default function MatchHistoryList({ matches, loading, error }) {
  if (loading)
    return (
      <p className="deck-note" role="status">
        Loading matches…
      </p>
    )
  if (error)
    return (
      <p className="identity-card__error" role="alert">
        {error}
      </p>
    )
  if (!matches.length) return <p className="deck-note">No matches yet.</p>
  return (
    <ul>
      {matches.map((match) => (
        <li key={match.id}>
          {new Date(match.started_at).toLocaleString()} — {match.status} —{' '}
          {match.id}
        </li>
      ))}
    </ul>
  )
}
