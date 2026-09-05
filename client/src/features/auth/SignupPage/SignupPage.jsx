import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../../design-system/Button/index.js'
import { useSession } from '../../session/session.js'
import AuthLayout from '../AuthLayout.jsx'
import useAuthentication from '../hooks/useAuthentication.js'
import SignupForm from './SignupForm.jsx'

export default function SignupPage() {
  const { user } = useSession()
  const navigate = useNavigate()
  const auth = useAuthentication(() => navigate('/lobby'))
  if (user) return <Navigate to="/lobby" replace />
  return (
    <AuthLayout className="signup-page">
      <section className="identity-card signup-form">
        <div className="identity-card__divider identity-card__divider--guest">
          <span>Create account</span>
        </div>
        <p className="signup-form__intro">
          Reserve a GamerName and keep your match history across the galaxy.
        </p>
        <SignupForm
          error={auth.error}
          loading={auth.loading}
          onSubmit={(credentials) => auth.authenticate('register', credentials)}
        />
        <div className="identity-card__divider">
          <span>or</span>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="google-login"
          disabled
          aria-disabled="true"
        >
          <span aria-hidden="true">G</span> Continue with Google{' '}
          <small>Coming soon</small>
        </Button>
        <div className="signup-form__links">
          <Link to="/">← Back to landing page</Link>
        </div>
      </section>
    </AuthLayout>
  )
}
