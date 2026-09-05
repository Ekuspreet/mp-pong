import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../session/session.js'

export default function SessionNavigation() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  if (!user || location.pathname === '/') return null

  async function handleLogout() {
    setPending(true)
    setError('')
    try {
      await logout()
      navigate('/')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <aside className="session-controls" aria-label="Player navigation">
      <div className="session-controls__identity">
        <strong title={user.username}>{user.username}</strong>
        <span>{user.guest ? 'Guest account' : 'Registered account'}</span>
        {error && <span role="alert">{error}</span>}
      </div>
      <nav>
        <Link to="/lobby">Lobby</Link>
        <Link to="/history">History</Link>
        <button disabled={pending} onClick={handleLogout}>
          {pending ? 'Logging out…' : 'Log out'}
        </button>
      </nav>
    </aside>
  )
}
