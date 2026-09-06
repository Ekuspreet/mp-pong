export const landingCopy = {
  description:
    'Play The Classic Pong In A Polygon. Defend Your Side To Be The Last One Standing.',
}

export const firstNames = [
  'Star',
  'Nova',
  'Orbit',
  'Comet',
  'Solar',
  'Lunar',
  'Cosmo',
  'Astro',
  'Galaxy',
  'Stellar',
  'Nebula',
  'Meteor',
  'Eclipse',
  'Aurora',
  'Celestial',
  'Zenith',
  'Quasar',
  'Pulsar',
  'Rocket',
  'Venus',
  'Mars',
  'Saturn',
  'Jupiter',
  'Mercury',
  'Pluto',
  'Titan',
  'Photon',
  'Cosmic',
  'Astra',
  'Infinity',
]

export const secondNames = [
  'Marshal',
  'Ranger',
  'Trek',
  'Pilot',
  'Voyager',
  'Scout',
  'Drifter',
  'Captain',
  'Explorer',
  'Admiral',
  'Navigator',
  'Commander',
  'Pathfinder',
  'Pioneer',
  'Traveler',
  'Rover',
  'Guardian',
  'Seeker',
  'Wanderer',
  'Frontier',
  'Trailblazer',
  'Starfarer',
  'Wayfinder',
  'Sentinel',
  'Nomad',
  'Commander',
  'Cosmonaut',
  'Adventurer',
  'Rider',
  'Discoverer',
]
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateCallSign(random = Math.random) {
  const pick = (values) => values[Math.floor(random() * values.length)]
  const first = pick(firstNames)
  const compatibleSecondNames = secondNames.filter(
    (name) => first.length + name.length <= 14,
  )
  const code = Array.from(
    { length: 4 },
    () => alphabet[Math.floor(random() * alphabet.length)],
  ).join('')
  return `${first}-${pick(compatibleSecondNames)}-${code}`
}
