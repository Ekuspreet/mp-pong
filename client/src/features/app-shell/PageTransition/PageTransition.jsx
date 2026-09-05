import { useLayoutEffect, useRef, useState } from 'react'

export default function PageTransition({ routeKey, disabled = false, children }) {
  const [displayed, setDisplayed] = useState({ routeKey, disabled, children })
  const stage = useRef(null)
  const exiting = displayed.routeKey !== routeKey
  if (!exiting && displayed.children !== children) {
    setDisplayed({ routeKey, disabled, children })
  }

  useLayoutEffect(() => {
    if (!exiting) return

    const showNextPage = () => setDisplayed({ routeKey, disabled, children })
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !stage.current?.querySelector('.deck-shell')) {
      showNextPage()
      return
    }

    // Keep the outgoing route mounted until its box has finished closing.
    const timeout = window.setTimeout(showNextPage, 500)
    return () => window.clearTimeout(timeout)
  }, [routeKey, disabled, children, exiting])

  const classes = ['route-stage', displayed.disabled ? 'route-stage--game' : 'page-transition', exiting && 'page-transition--closing'].filter(Boolean).join(' ')
  return <div key={displayed.routeKey} ref={stage} className={classes} inert={exiting ? true : undefined}>{displayed.children}</div>
}
