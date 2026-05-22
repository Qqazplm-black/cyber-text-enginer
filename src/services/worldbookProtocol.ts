import type { WorldBookSummary } from '../types/worldbook'

export function parseWorldBookSummary(raw: string): WorldBookSummary {
  const trimmed = raw.trim()
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('世界书解析失败，请重试')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('世界书数据无效')
  }

  const record = parsed as Record<string, unknown>
  const fields = ['worldview', 'characters', 'factions', 'rules'] as const

  const summary = {} as WorldBookSummary
  for (const key of fields) {
    const value = record[key]
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`世界书缺少「${fieldLabel(key)}」字段`)
    }
    summary[key] = value.trim()
  }

  return summary
}

/** 解析单段提取结果（允许「本段未提及」） */
export function parseWorldBookChunk(raw: string): WorldBookSummary {
  const trimmed = raw.trim()
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('世界书片段解析失败，请重试')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('世界书片段数据无效')
  }

  const record = parsed as Record<string, unknown>
  const fields = ['worldview', 'characters', 'factions', 'rules'] as const

  const summary = {} as WorldBookSummary
  for (const key of fields) {
    const value = record[key]
    summary[key] = typeof value === 'string' ? value.trim() : '（本段未提及）'
  }

  return summary
}

function fieldLabel(key: keyof WorldBookSummary): string {
  const labels: Record<keyof WorldBookSummary, string> = {
    worldview: '世界观',
    characters: '人物',
    factions: '势力',
    rules: '规则',
  }
  return labels[key]
}
