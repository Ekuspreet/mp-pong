export function createMatchPublisher() {
  const send = (socket, runtime, type, payload) => {
    if (socket.readyState !== socket.OPEN) return
    socket.send(
      JSON.stringify({
        type,
        sequence: ++runtime.sequence,
        serverTime: Date.now(),
        payload,
      }),
    )
  }
  return {
    send,
    broadcast: (runtime, type, payload) =>
      runtime.sockets.forEach((socket) => send(socket, runtime, type, payload)),
  }
}
