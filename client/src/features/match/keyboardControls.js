const leftKeys = new Set(['ArrowLeft', 'ArrowUp', 'a', 'w'])
const rightKeys = new Set(['ArrowRight', 'ArrowDown', 'd', 's'])
const normalize = (key) => (key.length === 1 ? key.toLowerCase() : key)

export function getDirection(held) {
  const left = [...held].some((key) => leftKeys.has(key))
  const right = [...held].some((key) => rightKeys.has(key))
  return left === right ? 0 : left ? -1 : 1
}

/** Returns cleanup; owns key state and DOM listeners, independent of React/socket. */
export function bindKeyboardControls(target, onDirection) {
  const held = new Set()
  let direction = 0
  const sendChanges = () => {
    const next = getDirection(held)
    if (next !== direction) {
      direction = next
      onDirection(next)
    }
  }
  const key = (event, down) => {
    const value = normalize(event.key)
    if (!leftKeys.has(value) && !rightKeys.has(value)) return
    if (
      down &&
      event.target?.closest?.(
        'input, textarea, select, [contenteditable="true"]',
      )
    )
      return
    event.preventDefault()
    if (down) held.add(value)
    else held.delete(value)
    sendChanges()
  }
  const down = (event) => key(event, true)
  const up = (event) => key(event, false)
  const clear = () => {
    held.clear()
    sendChanges()
  }
  target.addEventListener('keydown', down)
  target.addEventListener('keyup', up)
  target.addEventListener('blur', clear)
  return () => {
    target.removeEventListener('keydown', down)
    target.removeEventListener('keyup', up)
    target.removeEventListener('blur', clear)
    clear()
  }
}
