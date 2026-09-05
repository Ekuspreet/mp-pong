import DeckPage from '../app-shell/DeckPage.jsx'
import useMatchHistory from './useMatchHistory.js'
import MatchHistoryList from './MatchHistoryList.jsx'

export default function HistoryPage() {
  const history = useMatchHistory()
  return (
    <DeckPage
      leftTitle="Match history"
      left={<p className="deck-note">Your previous matches.</p>}
      rightTitle="Matches"
      right={<MatchHistoryList {...history} />}
    />
  )
}
