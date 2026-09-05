# Design system

The app uses Tailwind CSS v4 with a reusable CSS theme in `theme.css`.
`src/index.css` imports Tailwind, the theme, shared recipes, and page styles, in that order.
The theme extends Tailwind defaults; standard spacing (`p-4`, `gap-6`), sizes,
font weights, radii, and responsive variants remain available.

## Tokens

| Category | Utilities / tokens |
| --- | --- |
| Palette | `bg-space-950`, `bg-space-900`, `bg-space-800`, `text-cream`, `text-ink`, `border-teal`, `bg-orange`, `bg-red`, `bg-yellow`, `text-error` |
| Transparency | `bg-space-950/45`, `border-teal/60` |
| Fonts | `font-sans`, `font-display`, `font-mono` |
| Type sizes | `text-control`, `text-control-sm`, `text-label`, `text-badge`, `text-error`, `text-icon` |
| Tracking | `tracking-control`, `tracking-label`, `tracking-badge` |
| Control sizes | `min-h-control`, `size-control`, `min-h-control-sm` |
| Padding | `px-control-x py-control-y`, `px-control-sm-x py-control-sm-y`, `px-field-x py-field-y` |
| Gaps | `gap-control-gap`, `gap-field-gap` (or default `gap-2`, `gap-4`, etc.) |
| Shadows | `shadow-print`, `shadow-control`, `shadow-control-hover`, `shadow-control-active`, `shadow-control-disabled`, `shadow-ghost`, `shadow-focus` |
| Borders | `border-(length:--border-width-heavy) border-ink` |
| Motion | `duration-(--duration-control)` |
| Breakpoints | `phone:` (420px), `tablet:` (760px), plus Tailwind defaults |

`text-error` sets both error color and error font size. For independent control,
use `text-(color:--color-error)` or `text-(length:--text-error)`.
Theme variables are also available in custom CSS as `var(--color-cream)`, etc.
All theme variables are emitted using `@theme static` so CSS consumers can reuse them.

## Components

Existing React APIs remain unchanged:

```jsx
import { Button } from './design-system/Button'
import { Panel } from './design-system/Panel'
import { TextField } from './design-system/TextField'

<Panel tone="dark" className="p-6 tablet:p-8">
  <TextField id="nickname" label="Nickname" required />
  <Button variant="secondary" size="compact" className="mt-4 w-full">
    Join room
  </Button>
</Panel>
```

- Button: `variant="primary | secondary | ghost"`, `size="default | compact"`; supports `as`.
- Panel: `tone="dark | cream | signal"`; supports `as`.
- Badge: `tone="teal | yellow | red"`.
- IconButton: `variant="dark | light"`; provide an accessible `label`.
- TextField: `label`, unique `id`, optional `error`, and native input props.
- DeckShell: `left`, `right`, optional `leftTitle` and `rightTitle`.

CVA selects component recipes in `components.css`. Recipes use Tailwind `@apply`
and live in the components layer, so utilities supplied through `className` can
override them without `!important`. TextField's `className` styles its outer label.
Focus indicators and reduced-motion handling are shared globally.

## Adding or changing styles

Change brand values and shared control metrics in `theme.css`. Add a CVA variant
and a Tailwind recipe when a component needs another supported appearance.
Use default Tailwind utilities for ordinary layouts and spacing.

`App.css` retains page-specific compositions, decorative gradients, clip paths,
and route/deck animations in the components layer. These consume the shared
palette and font tokens but are not generic UI primitives. Canvas artwork and
raster assets retain their own rendering colors.

The theme uses Tailwind's official CSS theme API:
https://tailwindcss.com/docs/theme
