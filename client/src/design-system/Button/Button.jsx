import { cva } from 'class-variance-authority'

const styles = cva('ui-button', {
  variants: {
    variant: { primary: 'ui-button--primary', secondary: 'ui-button--secondary', ghost: 'ui-button--ghost' },
    size: { compact: 'ui-button--compact', default: '' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})

export default function Button({ as: Element = 'button', variant, size, className = '', ...props }) {
  return <Element className={styles({ variant, size, className })} {...props} />
}
