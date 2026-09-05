import { useState } from 'react'
import { Button } from '../../../design-system/Button/index.js'
import { TextField } from '../../../design-system/TextField/index.js'

export default function LoginForm({ loading, onSubmit }) {
  const [login, setLogin] = useState({ username: '', password: '' })
  return (
    <form
      className="login-entry"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(login)
      }}
    >
      <div className="login-entry__fields">
        <TextField
          id="landing-username"
          label="GamerName"
          value={login.username}
          onChange={(event) =>
            setLogin({ ...login, username: event.target.value })
          }
          autoComplete="username"
          required
        />
        <TextField
          id="landing-password"
          label="Password"
          type="password"
          value={login.password}
          onChange={(event) =>
            setLogin({ ...login, password: event.target.value })
          }
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" variant="secondary" disabled={loading}>
        Sign in
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="google-login"
        disabled
        aria-disabled="true"
      >
        <span aria-hidden="true">G</span> Continue with Google{' '}
        <small>Coming soon</small>
      </Button>
    </form>
  )
}
