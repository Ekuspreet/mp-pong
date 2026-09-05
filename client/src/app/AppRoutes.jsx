import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PageTransition } from '../features/app-shell/PageTransition/index.js'
import { SiteBackground } from '../features/app-shell/SiteBackground/index.js'
import SessionNavigation from '../features/app-shell/SessionNavigation.jsx'
import { LandingPage } from '../features/landing/LandingPage/index.js'
import { SignupPage } from '../features/auth/SignupPage/index.js'
import LobbyPage from '../features/lobby/LobbyPage.jsx'
import RoomPage from '../features/room/RoomPage.jsx'
import MatchPage from '../features/match/MatchPage.jsx'
import HistoryPage from '../features/history/HistoryPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

export default function AppRoutes() {
  const location = useLocation()
  const gamePage = location.pathname.startsWith('/matches/')
  return (
    <>
      {!gamePage && <SiteBackground />}
      <PageTransition routeKey={location.pathname} disabled={gamePage}>
        <SessionNavigation />
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<SignupPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/rooms/:id" element={<RoomPage />} />
            <Route path="/matches/:id" element={<MatchPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </>
  )
}
