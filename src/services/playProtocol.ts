import type { EndingType, OpeningResponse, PlayChoiceOption, PlayTurnResponse } from '../types/genesis'

const ENDING_TYPES: EndingType[] = [
  'victory',
  'defeat',
  'neutral',
  'bad_end',
  'secret',
]

export function parsePlayTurnResponse(raw: string): PlayTurnResponse {
  const trimmed = raw.trim()
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('剧情引擎返回了无法解析的格式')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('剧情数据无效')
  }

  const record = parsed as Record<string, unknown>
  const narrative = record.narrative
  if (typeof narrative !== 'string' || !narrative.trim()) {
    throw new Error('剧情引擎未返回有效剧情文本')
  }

  const ended = record.ended === true
  let choices: PlayChoiceOption[] = []

  if (!ended) {
    if (!Array.isArray(record.choices) || record.choices.length === 0) {
      throw new Error('剧情引擎未返回有效选项')
    }
    choices = record.choices.slice(0, 3).map((item, index) => {
      if (!item || typeof item !== 'object') {
        throw new Error(`选项 ${index + 1} 格式无效`)
      }
      const c = item as Record<string, unknown>
      if (typeof c.label !== 'string' || !c.label.trim()) {
        throw new Error(`选项 ${index + 1} 缺少文案`)
      }
      const effects = normalizeEffects(c.effects)
      return {
        label: c.label.trim(),
        effects,
      }
    })
  }

  const statDeltas = normalizeEffects(record.statDeltas)
  const endingMessage =
    typeof record.endingMessage === 'string'
      ? record.endingMessage.trim()
      : undefined

  let endingType: EndingType | null = null
  if (ended) {
    const rawType = record.endingType
    if (
      typeof rawType === 'string' &&
      ENDING_TYPES.includes(rawType as EndingType)
    ) {
      endingType = rawType as EndingType
    } else {
      endingType = 'neutral'
    }
  }

  return {
    narrative: narrative.trim(),
    choices,
    statDeltas,
    ended,
    endingType,
    endingMessage: endingMessage || undefined,
  }
}

/**
 * 解析开场白生成响应
 * 开场白响应格式：{ narrative: string, choices: PlayChoiceOption[] }
 */
export function parseOpeningResponse(raw: string): OpeningResponse {
  const trimmed = raw.trim()
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('开场白生成返回了无法解析的格式')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('开场白数据无效')
  }

  const record = parsed as Record<string, unknown>
  const narrative = record.narrative
  if (typeof narrative !== 'string' || !narrative.trim()) {
    throw new Error('开场白生成未返回有效文本')
  }

  if (!Array.isArray(record.choices) || record.choices.length === 0) {
    throw new Error('开场白生成未返回有效选项')
  }

  const choices = record.choices.slice(0, 3).map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`开场白选项 ${index + 1} 格式无效`)
    }
    const c = item as Record<string, unknown>
    if (typeof c.label !== 'string' || !c.label.trim()) {
      throw new Error(`开场白选项 ${index + 1} 缺少文案`)
    }
    const effects = normalizeEffects(c.effects)
    return {
      label: c.label.trim(),
      effects,
    }
  })

  return {
    narrative: narrative.trim(),
    choices,
  }
}

function normalizeEffects(
  raw: unknown,
): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const effects: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      effects[key] = value
    }
  }
  return Object.keys(effects).length > 0 ? effects : undefined
}
