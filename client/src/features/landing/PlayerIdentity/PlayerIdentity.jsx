import { Link } from 'react-router-dom'
import GuestForm from './GuestForm.jsx'
import LoginForm from './LoginForm.jsx'

export default function PlayerIdentity({ error, loading, onGuest, onLogin }) {
  return (
    <section className="identity-card">
      {error && (
        <p className="identity-card__error" role="alert">
          {error}
        </p>
      )}
      <GuestForm loading={loading} onSubmit={onGuest} />
      <div className="identity-card__divider">
        <span>or login</span>
      </div>
      <LoginForm loading={loading} onSubmit={onLogin} />
      <div className="identity-card__account">
        <Link to="/register">New pilot? Create an account →</Link>
      </div>
    </section>
  )
}
