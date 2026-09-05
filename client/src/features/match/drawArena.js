/** Pure canvas drawing: no React lifecycle, networking or input handling. */
export function drawArena(context, snapshot, width, height) {
  context.clearRect(0, 0, width, height)
  if (!snapshot) return
  const zoom = Math.min(width / 1100, height / 750),
    point = (v) => ({ x: width / 2 + v.x * zoom, y: height / 2 + v.y * zoom })
  context.strokeStyle = '#777'
  context.lineWidth = 2
  for (const side of snapshot.arena.sides) {
    const a = point(side.start),
      b = point(side.end)
    context.beginPath()
    context.moveTo(a.x, a.y)
    context.lineTo(b.x, b.y)
    context.stroke()
  }
  snapshot.paddles.forEach((paddle, index) => {
    const side = snapshot.arena.sides[paddle.sideIndex],
      size = Math.hypot(side.end.x - side.start.x, side.end.y - side.start.y),
      half = paddle.length / size / 2,
      lerp = (a, b, t) => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      }),
      a = point(lerp(side.start, side.end, paddle.position - half)),
      b = point(lerp(side.start, side.end, paddle.position + half))
    context.strokeStyle = `hsl(${index * 71} 70% 40%)`
    context.lineWidth = 12
    context.beginPath()
    context.moveTo(a.x, a.y)
    context.lineTo(b.x, b.y)
    context.stroke()
  })
  const ball = point(snapshot.ball.position)
  context.fillStyle = '#111'
  context.beginPath()
  context.arc(ball.x, ball.y, snapshot.ball.radius * zoom, 0, Math.PI * 2)
  context.fill()
}
