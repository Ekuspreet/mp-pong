import { randomUUID } from 'node:crypto'
import {
  GAME_CONFIG,
  advanceMatch,
  createMatch,
  eliminate,
  publicSnapshot,
  setInput,
} from '@polygon-pong/shared'

export function createMatchManager(repository, publisher) {
  const matches = new Map()
  const forUser = (userId) =>
    [...matches.values()].find(
      (runtime) =>
        runtime.state.players.some(
          (player) => player.id === userId && player.status !== 'eliminated',
        ) && !['complete', 'no_contest'].includes(runtime.state.phase),
    )
  const finish = (runtime) => {
    clearInterval(runtime.interval)
    runtime.disconnectTimers.forEach(clearTimeout)
    runtime.room.status = 'finished'
    repository.finish(runtime.state, Date.now())
    matches.delete(runtime.state.matchId)
  }
  const flushEvents = (runtime) => {
    while (runtime.eventCursor < runtime.state.events.length) {
      const event = runtime.state.events[runtime.eventCursor++]
      publisher.broadcast(runtime, event.type, event)
      if (event.type === 'stage.started')
        repository.stageStarted(
          runtime.state.matchId,
          event.stage,
          event.playerIds.length,
          event.seed,
          Date.now(),
        )
      if (event.type === 'player.eliminated')
        repository.playerEliminated(
          runtime.state.matchId,
          runtime.state.stage,
          event.playerId,
        )
      if (event.type === 'match.ended') {
        publisher.broadcast(
          runtime,
          'game.snapshot',
          publicSnapshot(runtime.state),
        )
        finish(runtime)
      }
    }
  }
  const tick = (runtime) => {
    const now = performance.now()
    const seconds = Math.min((now - runtime.lastTime) / 1000, 0.1)
    runtime.lastTime = now
    advanceMatch(runtime.state, seconds, Date.now())
    flushEvents(runtime)
    if (!matches.has(runtime.state.matchId)) return
    if (
      runtime.state.tick %
        Math.round(GAME_CONFIG.tickRate / GAME_CONFIG.snapshotRate) ===
      0
    )
      publisher.broadcast(
        runtime,
        'game.snapshot',
        publicSnapshot(runtime.state),
      )
  }
  const start = (room, sockets) => {
    const id = randomUUID()
    const now = Date.now()
    const players = [...room.members.values()].map(
      ({ id: playerId, username }) => ({ id: playerId, username }),
    )
    const state = createMatch(
      id,
      players,
      now,
      Math.floor(Math.random() * 2 ** 32),
      room.hostId,
      room.options,
    )
    repository.start(state, room.code)
    room.status = 'in_match'
    room.matchId = id
    const runtime = {
      state,
      room,
      sockets,
      inputSequences: new Map(),
      disconnectTimers: new Map(),
      lastTime: performance.now(),
      sequence: 0,
      eventCursor: 0,
      interval: undefined,
    }
    runtime.interval = setInterval(
      () => tick(runtime),
      1000 / GAME_CONFIG.tickRate,
    )
    runtime.interval.unref()
    matches.set(id, runtime)
    publisher.broadcast(runtime, 'match.started', publicSnapshot(state))
    return state
  }
  const input = (userId, sequence, direction, socket) => {
    const runtime = forUser(userId)
    if (
      !runtime ||
      (socket && runtime.sockets.get(userId) !== socket) ||
      sequence <= (runtime.inputSequences.get(userId) ?? -1)
    )
      return
    runtime.inputSequences.set(userId, sequence)
    setInput(runtime.state, userId, direction)
  }
  const connect = (userId, socket) => {
    const runtime = forUser(userId)
    if (!runtime) return
    const previousSocket = runtime.sockets.get(userId)
    runtime.sockets.set(userId, socket)
    if (previousSocket && previousSocket !== socket)
      previousSocket.close(4000, 'Connection replaced')
    const timer = runtime.disconnectTimers.get(userId)
    if (timer) clearTimeout(timer)
    runtime.disconnectTimers.delete(userId)
    const player = runtime.state.players.find(
      (candidate) => candidate.id === userId,
    )
    if (player?.status === 'disconnected') {
      player.status = 'active'
      player.disconnectedAt = null
    }
    publisher.send(
      socket,
      runtime,
      'game.snapshot',
      publicSnapshot(runtime.state),
    )
  }
  const join = (userId, matchId, socket) => {
    const runtime = matches.get(matchId)
    const player = runtime?.state.players.find(
      (candidate) => candidate.id === userId,
    )
    if (
      !runtime ||
      !player ||
      ['complete', 'no_contest'].includes(runtime.state.phase)
    )
      throw Object.assign(new Error('Match is unavailable'), {
        code: 'MATCH_ACCESS_DENIED',
      })
    const previousSocket = runtime.sockets.get(userId)
    runtime.sockets.set(userId, socket)
    if (previousSocket && previousSocket !== socket)
      previousSocket.close(4000, 'Connection replaced')
    if (player.status === 'disconnected') {
      player.status = 'active'
      player.disconnectedAt = null
    }
    const timer = runtime.disconnectTimers.get(userId)
    if (timer) clearTimeout(timer)
    runtime.disconnectTimers.delete(userId)
    publisher.send(
      socket,
      runtime,
      'game.snapshot',
      publicSnapshot(runtime.state),
    )
    return runtime
  }
  const disconnect = (userId, socket) => {
    const runtime = forUser(userId)
    if (!runtime || runtime.state.phase === 'complete') return
    if (socket && runtime.sockets.get(userId) !== socket) return
    runtime.sockets.delete(userId)
    const player = runtime.state.players.find(
      (candidate) => candidate.id === userId,
    )
    if (!player || player.status === 'eliminated') return
    player.status = 'disconnected'
    player.disconnectedAt = Date.now()
    setInput(runtime.state, userId, 0)
    const timer = setTimeout(() => {
      eliminate(runtime.state, userId, 'forfeit', Date.now())
      runtime.disconnectTimers.delete(userId)
      flushEvents(runtime)
    }, GAME_CONFIG.reconnectGraceMs)
    timer.unref()
    runtime.disconnectTimers.set(userId, timer)
  }
  const leave = (userId, socket) => {
    const runtime = forUser(userId)
    if (!runtime || runtime.state.phase === 'complete') return
    if (socket && runtime.sockets.get(userId) !== socket) return
    runtime.sockets.delete(userId)
    const timer = runtime.disconnectTimers.get(userId)
    if (timer) clearTimeout(timer)
    runtime.disconnectTimers.delete(userId)
    const player = runtime.state.players.find(
      (candidate) => candidate.id === userId,
    )
    if (!player || player.status === 'eliminated') return
    eliminate(runtime.state, userId, 'forfeit', Date.now())
    flushEvents(runtime)
  }
  const close = () =>
    matches.forEach((runtime) => {
      clearInterval(runtime.interval)
      runtime.disconnectTimers.forEach(clearTimeout)
    })
  const updateHost = (roomId, hostId) => {
    const runtime = [...matches.values()].find(
      (candidate) => candidate.room.id === roomId,
    )
    if (!runtime || !hostId) return
    runtime.state.hostId = hostId
    publisher.broadcast(runtime, 'game.snapshot', publicSnapshot(runtime.state))
  }
  return {
    matches,
    start,
    input,
    connect,
    join,
    disconnect,
    leave,
    forUser,
    result: repository.result,
    history: repository.history,
    updateHost,
    close,
  }
}
