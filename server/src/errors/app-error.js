export function createAppError(code, message, status = 400) {
  return Object.assign(new Error(message), { code, status })
}
