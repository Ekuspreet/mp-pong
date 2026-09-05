import eliminationArt from '../../assets/gameoptions/elimination.png'
import bestScoreArt from '../../assets/gameoptions/bestscore.png'
import stocksArt from '../../assets/gameoptions/stocks.png'
import vortexArt from '../../assets/gameoptions/vortex.png'
import pulseArt from '../../assets/gameoptions/pulse.png'
import blackHoleArt from '../../assets/gameoptions/blackhole.png'
import wormholeArt from '../../assets/gameoptions/wormhole.png'
import multiballArt from '../../assets/gameoptions/multiball.png'

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
      'Misses award knockout points. Win by reaching the target or leading when time expires.',
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
    description: 'A central vortex curves the ball and pulls it inward.',
    art: vortexArt,
  },
  {
    id: 'pulse',
    label: 'Pulse',
    description: 'Regular shockwaves push the ball outward.',
    art: pulseArt,
  },
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'A moving gravity well bends nearby ball paths.',
    art: blackHoleArt,
  },
  {
    id: 'wormhole',
    label: 'Wormhole',
    description:
      'Two portals teleport the ball while preserving velocity and entry angle.',
    art: wormholeArt,
  },
  {
    id: 'multiball',
    label: 'Multiball',
    description: 'A second ball appears after a long rally.',
    art: multiballArt,
  },
]
