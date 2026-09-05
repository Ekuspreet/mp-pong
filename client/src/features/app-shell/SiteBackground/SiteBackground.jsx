import { SpaceScene } from '../../landing/SpaceScene/index.js'

export default function SiteBackground() {
  return <div className="site-background" aria-hidden="true">
    <SpaceScene />
    <div className="site-background__grain" />
  </div>
}
