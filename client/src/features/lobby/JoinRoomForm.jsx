import { useState } from 'react'
import { Button } from '../../design-system/Button/index.js'
import { TextField } from '../../design-system/TextField/index.js'

export default function JoinRoomForm({ onJoin }) {
  const [code, setCode] = useState('')
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onJoin(code.trim())
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
      <Button type="submit" variant="secondary">
        Join room
      </Button>
    </form>
  )
}
