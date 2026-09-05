import { useState } from 'react'
import { Button } from '../../../design-system/Button/index.js'
import { IconButton } from '../../../design-system/IconButton/index.js'
import { generateCallSign } from '../config/content.js'

export default function GuestForm({ loading, onSubmit }) {
  const [callSign, setCallSign] = useState(generateCallSign)
  return (
    <form
      className="guest-entry"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ username: callSign })
      }}
    >
      <div className="identity-card__divider identity-card__divider--guest">
        <span>Play as Guest</span>
      </div>
      <div className="guest-entry__identity">
        <label htmlFor="guest-call-sign">GamerName</label>
        <input
          id="guest-call-sign"
          value={callSign}
          onChange={(event) => setCallSign(event.target.value)}
          minLength="3"
          maxLength="20"
          pattern="[A-Za-z0-9_-]+"
          autoComplete="nickname"
          required
        />
        <IconButton
          label="Generate another GamerName"
          variant="light"
          onClick={() => setCallSign(generateCallSign())}
        >
          <span aria-hidden="true">↻</span>
        </IconButton>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Opening airlock…' : 'Start Game'}{' '}
        <span aria-hidden="true">→</span>
      </Button>
    </form>
  )
}
