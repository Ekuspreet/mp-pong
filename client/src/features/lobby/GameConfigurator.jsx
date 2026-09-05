import { Badge } from '../../design-system/Badge/index.js'
import { GAME_FORMATS, GAME_MODIFIERS } from './gameOptions.js'

export default function GameConfigurator({
  format,
  setFormat,
  modifiers,
  toggleModifier,
}) {
  const option = (item, type) => (
    <label
      className="game-option game-option--visual"
      key={item.id}
      style={{ '--option-image': `url(${item.art})` }}
    >
      <input
        type={type}
        name={type === 'radio' ? 'game-format' : undefined}
        value={item.id}
        checked={
          type === 'radio' ? format === item.id : modifiers.includes(item.id)
        }
        onChange={() =>
          type === 'radio' ? setFormat(item.id) : toggleModifier(item.id)
        }
      />
      <span className="game-option__image" aria-hidden="true" />
      <span className="game-option__copy">
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
    </label>
  )
  return (
    <div className="game-configurator">
      <div>
        <Badge>Game configuration</Badge>
      </div>
      <fieldset className="game-options game-options--formats">
        <legend>Game mode · select one</legend>
        {GAME_FORMATS.map((item) => option(item, 'radio'))}
      </fieldset>
      <fieldset className="game-options game-options--modifiers">
        <legend>Modifiers · select any</legend>
        {GAME_MODIFIERS.map((item) => option(item, 'checkbox'))}
      </fieldset>
    </div>
  )
}
