export function selectRoomState(room, userId) {
  const members = room?.members ?? []
  const member = members.find((item) => item.id === userId)
  return {
    members,
    member,
    canStart: Boolean(
      member?.host &&
      members.length >= 2 &&
      members.every((item) => item.ready),
    ),
  }
}
