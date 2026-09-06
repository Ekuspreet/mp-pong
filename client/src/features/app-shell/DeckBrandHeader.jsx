import polygonPongLogo from '../../assets/logo.png'
import oqueLogo from '../../assets/OQUE.png'

export default function DeckBrandHeader() {
  return (
    <header className="deck-brand" aria-label="Polygon Pong by OQUE Software">
      <img
        className="deck-brand__game"
        src={polygonPongLogo}
        alt="Polygon Pong"
      />
      <span className="deck-brand__divider" aria-hidden="true" />
      <img className="deck-brand__studio" src={oqueLogo} alt="OQUE Software" />
    </header>
  )
}
