import { landingCopy } from '../config/content.js'
import logoUrl from '../../../assets/logo.png'

export default function HeroCopy() {
  return (
    <header className="hero-copy">
      <img className="hero-copy__logo" src={logoUrl} alt="Polygon Pong" />
      <p>{landingCopy.description}</p>
    </header>
  )
}
