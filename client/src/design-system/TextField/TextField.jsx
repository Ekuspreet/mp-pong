export default function TextField({ label, error, id, className = '', ...props }) {
  return <label className={`ui-field ${className}`} htmlFor={id}>
    <span className="ui-field__label">{label}</span>
    <input className="ui-field__input" id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
    {error && <span className="ui-field__error" id={`${id}-error`} role="alert">{error}</span>}
  </label>
}
