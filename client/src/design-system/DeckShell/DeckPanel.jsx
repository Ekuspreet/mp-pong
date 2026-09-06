import { Panel } from '../Panel/index.js'

const outlines = {
  left: [
    [0, 0],
    [88, 0],
    [94, 5],
    [100, 0],
    [100, 100],
    [94, 95],
    [88, 100],
    [0, 100],
    [0, 94],
    [6, 94],
    [6, 6],
    [0, 6],
  ],
  right: [
    [0, 0],
    [6, 5],
    [12, 0],
    [100, 0],
    [100, 6],
    [94, 6],
    [94, 94],
    [100, 94],
    [100, 100],
    [12, 100],
    [6, 95],
    [0, 100],
  ],
}

export default function DeckPanel({ side, children }) {
  const points = outlines[side]
  // Trace only horizontal and vertical edges; the diagonal notches stay unoutlined.
  const borderPath = points
    .map(([x, y], index) => {
      const [nextX, nextY] = points[(index + 1) % points.length]
      return x === nextX || y === nextY ? `M ${x} ${y} L ${nextX} ${nextY}` : ''
    })
    .join(' ')
  return (
    <Panel
      className={`deck-shell__panel deck-shell__panel--${side}`}
      style={{
        '--deck-panel-shape': `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`,
      }}
    >
      <svg
        className="deck-shell__outline"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={borderPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {children}
    </Panel>
  )
}
