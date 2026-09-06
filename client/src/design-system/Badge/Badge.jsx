import { cva } from 'class-variance-authority'

const styles = cva('ui-badge', {
  variants: {
    tone: {
      teal: 'ui-badge--teal',
      yellow: 'ui-badge--yellow',
      red: 'ui-badge--red',
    },
  },
  defaultVariants: { tone: 'teal' },
})
export default function Badge({ tone, className = '', ...props }) {
  return <span className={styles({ tone, className })} {...props} />
}
