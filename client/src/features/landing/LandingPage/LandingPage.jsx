import { useNavigate } from 'react-router-dom'
import { PlayerIdentity } from '../PlayerIdentity/index.js'
import AuthLayout from '../../auth/AuthLayout.jsx'
import useAuthentication from '../../auth/hooks/useAuthentication.js'

export default function LandingPage() {
  const navigate = useNavigate()
  const auth = useAuthentication(() => navigate('/lobby'))
  return (
    <AuthLayout>
      <PlayerIdentity
        error={auth.error}
        loading={auth.loading}
        onGuest={(credentials) => auth.authenticate('guest', credentials)}
        onLogin={(credentials) => auth.authenticate('login', credentials)}
      />
    </AuthLayout>
  )
}
