function snapshotRoom(room) {
  return {
    id: room.id,
    code: room.code,
    visibility: room.visibility,
    status: room.status,
    options: {
      format: room.options.format,
      modifiers: [...room.options.modifiers],
    },
    matchId: room.matchId,
    members: [...room.members.values()].map((m) => ({
      id: m.id,
      username: m.username,
      guest: m.guest,
      ready: m.ready,
      connected: m.connected,
      host: m.id === room.hostId,
    })),
  }
}
export { snapshotRoom }
