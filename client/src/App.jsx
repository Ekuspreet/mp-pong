import { BrowserRouter } from 'react-router-dom'
import { defaultServices } from './services/defaultServices.js'
import { ServicesProvider } from './app/services.js'
import { SessionProvider } from './features/session/SessionProvider.jsx'
import { GameConnectionProvider } from './features/session/GameConnectionProvider.jsx'
import AppRoutes from './app/AppRoutes.jsx'

/** Composition root: replace services to run against another backend or test doubles. */
export default function App({ services = defaultServices }) {
  return (
    <BrowserRouter>
      <ServicesProvider value={services}>
        <SessionProvider>
          <GameConnectionProvider>
            <AppRoutes />
          </GameConnectionProvider>
        </SessionProvider>
      </ServicesProvider>
    </BrowserRouter>
  )
}
