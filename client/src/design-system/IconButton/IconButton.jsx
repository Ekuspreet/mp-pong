import { cva } from 'class-variance-authority'

const styles = cva('ui-icon-button', {
  variants: {
    variant: { dark: 'ui-icon-button--dark', light: 'ui-icon-button--light' },
  },
  defaultVariants: { variant: 'dark' },
})
export default function IconButton({
  label,
  variant,
  className = '',
  ...props
}) {
  return (
    <button
      className={styles({ variant, className })}
      aria-label={label}
      title={label}
      type="button"
      {...props}
    />
  )
}
