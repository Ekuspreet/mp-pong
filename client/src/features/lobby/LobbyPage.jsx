import { useNavigate } from 'react-router-dom'
import DeckPage from '../app-shell/DeckPage.jsx'
import useLobby from './useLobby.js'
import LobbyActions from './LobbyActions.jsx'
import GameConfigurator from './GameConfigurator.jsx'

export default function LobbyPage() {
  const navigate = useNavigate()
  const lobby = useLobby((id) => navigate(`/rooms/${id}`))
  return (
    <DeckPage
      className="lobby-deck"
      left={
        <LobbyActions
          error={lobby.error}
          creating={lobby.creating}
          onCreate={lobby.createRoom}
          onJoin={(code, password) =>
            navigate(`/rooms/${code}`, { state: { password } })
          }
        />
      }
      right={
        <GameConfigurator
          format={lobby.format}
          setFormat={lobby.setFormat}
          modifiers={lobby.modifiers}
          toggleModifier={lobby.toggleModifier}
        />
      }
    />
  )
}
