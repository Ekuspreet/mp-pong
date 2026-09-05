import { useState } from 'react'
import { Button } from '../../../design-system/Button/index.js'
import { TextField } from '../../../design-system/TextField/index.js'

export default function SignupForm({ error, loading, onSubmit }) {
  const [fields, setFields] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [validationError, setValidationError] = useState('')
  const update = (name) => (event) => {
    setFields((current) => ({ ...current, [name]: event.target.value }))
    setValidationError('')
  }
  function submit(event) {
    event.preventDefault()
    if (fields.password !== fields.confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }
    setValidationError('')
    onSubmit({ username: fields.username, password: fields.password })
  }
  return (
    <form onSubmit={submit}>
      <TextField
        id="signup-username"
        label="GamerName"
        value={fields.username}
        onChange={update('username')}
        minLength="3"
        maxLength="20"
        pattern="[A-Za-z0-9_]+"
        autoComplete="username"
        required
      />
      <div className="signup-form__passwords">
        <TextField
          id="signup-password"
          label="Password"
          type="password"
          value={fields.password}
          onChange={update('password')}
          maxLength="128"
          autoComplete="new-password"
          required
        />
        <TextField
          id="signup-confirm-password"
          label="Confirm password"
          type="password"
          value={fields.confirmPassword}
          onChange={update('confirmPassword')}
          maxLength="128"
          autoComplete="new-password"
          required
        />
      </div>
      {(validationError || error) && (
        <p className="identity-card__error" role="alert">
          {validationError || error}
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating pilot…' : 'Create account'}{' '}
        <span aria-hidden="true">→</span>
      </Button>
    </form>
  )
}
