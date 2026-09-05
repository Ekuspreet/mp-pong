import oqueUrl from '../../../assets/OQUE.png'

export default function LandingNav() {
  return <header className="landing-nav" aria-label="OQUE Software">
    <div className="brand-lockup">
      <span className="oque-mark"><img src={oqueUrl} alt="OQUE Software" /></span>
    </div>
  </header>
}
