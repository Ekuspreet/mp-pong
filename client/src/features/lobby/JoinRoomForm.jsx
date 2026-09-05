import { useState } from 'react'
import { Button } from '../../design-system/Button/index.js'
import { TextField } from '../../design-system/TextField/index.js'

export default function JoinRoomForm({ onJoin }) {
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onJoin(code.trim(), password)
      }}
    >
      <TextField
        id="room-code"
        label="Room code"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        minLength="6"
        maxLength="6"
        pattern="[A-Za-z0-9_-]{6}"
        autoComplete="off"
        required
      />
      <TextField
        id="room-password"
        label="Password (optional)"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        maxLength="128"
        autoComplete="current-password"
      />
      <Button type="submit" variant="secondary">
        Join room
      </Button>
    </form>
  )
}
