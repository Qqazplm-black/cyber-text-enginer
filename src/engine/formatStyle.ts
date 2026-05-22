import { STYLE_DIMENSIONS, type WritingStyleProfile } from '../types/style'

export function formatStyleForPrompt(profile: WritingStyleProfile): string {
  return STYLE_DIMENSIONS.map((dim) => {
    const p = profile[dim.key]
    const tags = p.tags.length > 0 ? p.tags.join('、') : '（未标注）'
    return `- ${dim.label}（权重 ${p.weight}/100）：${tags}`
  }).join('\n')
}
