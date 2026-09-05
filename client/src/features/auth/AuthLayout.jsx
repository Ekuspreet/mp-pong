import { HeroCopy } from '../landing/HeroCopy/index.js'
import { LandingNav } from '../landing/LandingNav/index.js'

export default function AuthLayout({ children, className = '' }) {
  return (
    <main className={`landing-page ${className}`}>
      <LandingNav />
      <div className="landing-page__content">
        <HeroCopy />
        {children}
      </div>
    </main>
  )
}
