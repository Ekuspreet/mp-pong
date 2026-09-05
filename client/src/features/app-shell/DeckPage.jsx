import { DeckShell } from '../../design-system/DeckShell/index.js'
import DeckBrandHeader from './DeckBrandHeader.jsx'

/** Product branding is composed here, outside the reusable layout. */
export default function DeckPage(props) {
  return <DeckShell {...props} header={<DeckBrandHeader />} />
}
