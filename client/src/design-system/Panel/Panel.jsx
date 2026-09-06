import { cva } from 'class-variance-authority'

const styles = cva('ui-panel', {
  variants: {
    tone: {
      dark: 'ui-panel--dark',
      cream: 'ui-panel--cream',
      signal: 'ui-panel--signal',
    },
  },
  defaultVariants: { tone: 'dark' },
})

export default function Panel({
  as: Element = 'section',
  tone,
  className = '',
  ...props
}) {
  return <Element className={styles({ tone, className })} {...props} />
}
