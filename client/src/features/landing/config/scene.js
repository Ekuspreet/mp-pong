export const sceneConfig = {
  desktopBallLimit: 26,
  mobileBallLimit: 14,
  spawnEveryMs: 850,
  fixedStepMs: 1000 / 60,
  comets: {
    minDelayMs: 4_500,
    maxDelayMs: 11_000,
    maxVisible: 3,
  },
  blackHole: {
    triggerBallCount: 12,
    cooldownMs: 25_000,
    durationMs: 10_000,
    pullRadius: 460,
    positions: [
      { x: 0.14, y: 0.72 },
      { x: 0.86, y: 0.24 },
      { x: 0.88, y: 0.78 },
      { x: 0.16, y: 0.28 },
    ],
  },
  colors: ['#ef5b34', '#f5b642', '#70b7b5', '#f7e8c6', '#d9414b'],
  planets: [
    { x: 0.1, y: 0.17, radius: 72, color: '#70b7b5', ring: '#f7e8c6', orbit: { centerX: 0.15, centerY: 0.2, radiusX: 0.07, radiusY: 0.055, speed: 0.000025, phase: 3.5 } },
    { x: 0.88, y: 0.74, radius: 108, color: '#ef5b34', ring: '#f5b642', orbit: { centerX: 0.82, centerY: 0.71, radiusX: 0.075, radiusY: 0.05, speed: -0.000014, phase: 0.4 } },
    { x: 0.72, y: 0.12, radius: 35, color: '#d9414b', ring: '#70b7b5', orbit: { centerX: 0.72, centerY: 0.15, radiusX: 0.1, radiusY: 0.06, speed: 0.000032, phase: 2.1 } },
  ],
}
