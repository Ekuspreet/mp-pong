import DeckPanel from './DeckPanel.jsx'

export default function DeckShell({
  leftTitle,
  rightTitle,
  left,
  right,
  header,
  className = '',
}) {
  return (
    <main className={`deck-page ${className}`}>
      {header}
      <div className="deck-shell">
        <DeckPanel side="left">
          {leftTitle && (
            <h1 className="deck-shell__title">
              <span>{leftTitle}</span>
            </h1>
          )}
          <div
            className="deck-shell__content"
            role="region"
            aria-label={leftTitle || 'Room actions'}
            tabIndex={0}
          >
            {left}
          </div>
          {leftTitle && <div className="deck-shell__rail" aria-hidden="true" />}
        </DeckPanel>
        <div className="deck-shell__hinge" aria-hidden="true" />
        <DeckPanel side="right">
          {rightTitle && (
            <h2 className="deck-shell__title">
              <span>{rightTitle}</span>
            </h2>
          )}
          <div
            className="deck-shell__content"
            role="region"
            aria-label={rightTitle || 'Game configuration'}
            tabIndex={0}
          >
            {right}
          </div>
          {rightTitle && (
            <div className="deck-shell__rail" aria-hidden="true" />
          )}
        </DeckPanel>
      </div>
    </main>
  )
}
