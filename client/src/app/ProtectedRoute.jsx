import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../features/session/session.js'

export default function ProtectedRoute() {
  const { user } = useSession()
  if (user === undefined) return <output>Loading session…</output>
  return user ? <Outlet /> : <Navigate to="/" replace />
}
