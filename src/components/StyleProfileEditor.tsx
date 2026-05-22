import { STYLE_DIMENSIONS, type WritingStyleProfile } from '../types/style'
import './StyleProfileEditor.css'

type Props = {
  profile: WritingStyleProfile
  onChange: (profile: WritingStyleProfile) => void
  disabled?: boolean
}

export default function StyleProfileEditor({
  profile,
  onChange,
  disabled = false,
}: Props) {
  return (
    <div className="style-editor">
      <p className="style-editor__hint">
        文风标签（可编辑权重 0～100，游玩时 AI 将严格遵循）
      </p>
      {STYLE_DIMENSIONS.map((dim) => {
        const p = profile[dim.key]
        return (
          <div key={dim.key} className="style-editor__dim">
            <div className="style-editor__dim-head">
              <span className="style-editor__label">{dim.label}</span>
              <span className="style-editor__weight">{p.weight}</span>
            </div>
            {p.tags.length > 0 && (
              <div className="style-editor__tags-row" aria-label={`${dim.label}标签`}>
                {p.tags.map((tag) => (
                  <span key={tag} className="style-editor__tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <input
              type="range"
              min={0}
              max={100}
              value={p.weight}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...profile,
                  [dim.key]: { ...p, weight: Number(e.target.value) },
                })
              }
              className="style-editor__slider"
            />
            <input
              type="text"
              className="style-editor__tags"
              value={p.tags.join('、')}
              disabled={disabled}
              placeholder="标签，用顿号分隔"
              onChange={(e) =>
                onChange({
                  ...profile,
                  [dim.key]: {
                    ...p,
                    tags: e.target.value
                      .split(/[、,，]/)
                      .map((t) => t.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </div>
        )
      })}
    </div>
  )
}
