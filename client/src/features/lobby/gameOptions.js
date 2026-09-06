import eliminationArt from '../../assets/gameoptions/elimination.png'
import bestScoreArt from '../../assets/gameoptions/bestscore.png'
import stocksArt from '../../assets/gameoptions/stocks.png'
import vortexArt from '../../assets/gameoptions/vortex.png'
import pulseArt from '../../assets/gameoptions/pulse.png'
import blackHoleArt from '../../assets/gameoptions/blackhole.png'
import wormholeArt from '../../assets/gameoptions/wormhole.png'

export const GAME_FORMATS = [
  {
    id: 'elimination',
    label: 'Elimination',
    description:
      'A miss eliminates the defender; the polygon rebuilds after each elimination.',
    art: eliminationArt,
  },
  {
    id: 'best_score',
    label: 'Best Score',
    description:
      'Each miss counts against the defender. The first player to reach 25 misses loses; the player with the fewest misses wins.',
    art: bestScoreArt,
  },
  {
    id: 'stocks',
    label: 'Stocks',
    description:
      'Each player has three lives. Final-life losses shrink the arena; forced misses restore 0.5 lives.',
    art: stocksArt,
  },
]
export const GAME_MODIFIERS = [
  {
    id: 'vortex',
    label: 'Vortex',
    description:
      'A central vortex curves the ball clockwise or counterclockwise and grows stronger over time.',
    art: vortexArt,
  },
  {
    id: 'pulse',
    label: 'Pulse',
    description:
      'Shockwaves periodically originate at the center and push the ball outward.',
    art: pulseArt,
  },
  {
    id: 'orbit',
    label: 'Orbit',
    description:
      'A gentle gravity well bends the ball into an alternating orbit.',
    art: blackHoleArt,
  },
  {
    id: 'wormhole',
    label: 'Wormhole',
    description:
      'A dark entrance and light exit teleport the ball while preserving momentum and direction.',
    art: wormholeArt,
  },
]
