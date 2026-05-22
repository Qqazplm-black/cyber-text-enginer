import { PERSONALITY_OPTIONS } from '../types/personality'
import type { GenesisPersonality } from '../types/genesis'
import './PersonalityPicker.css'

type Props = {
  value: GenesisPersonality | null
  onChange: (value: GenesisPersonality) => void
  disabled?: boolean
}

export default function PersonalityPicker({
  value,
  onChange,
  disabled = false,
}: Props) {
  const hasSelection = value !== null

  return (
    <fieldset className="personality-picker" disabled={disabled}>
      <legend className="personality-picker__legend">创世 AI 人格</legend>
      <div className="personality-picker__options">
        {PERSONALITY_OPTIONS.map((opt) => {
          const isSelected = value === opt.id
          const isCollapsed = hasSelection && !isSelected

          return (
            <label
              key={opt.id}
              className={[
                'personality-picker__card',
                isSelected ? 'personality-picker__card--active' : '',
                isCollapsed ? 'personality-picker__card--collapsed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                type="radio"
                name="genesis-personality"
                value={opt.id}
                checked={isSelected}
                onChange={() => onChange(opt.id)}
              />

              {/* 标题行 - 始终显示 */}
              <div className="personality-picker__header">
                <span className="personality-picker__title">{opt.title}</span>
                {isCollapsed && (
                  <span className="personality-picker__collapse-hint">
                    {opt.description}
                  </span>
                )}
              </div>

              {/* 描述 - 选中时展开 */}
              <div
                className={`personality-picker__expandable ${
                  isSelected ? 'personality-picker__expandable--open' : ''
                }`}
              >
                <p className="personality-picker__desc">
                  {opt.expandedDescription}
                </p>

                {/* 示例对话 */}
                <div className="personality-picker__examples">
                  <span className="personality-picker__examples-label">
                    对话示例
                  </span>
                  <ul className="personality-picker__examples-list">
                    {opt.exampleDialogues.map((dialogue, i) => (
                      <li key={i} className="personality-picker__example-item">
                        <span className="personality-picker__example-bubble">
                          {dialogue}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
