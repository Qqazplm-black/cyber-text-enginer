import {
  createDefaultStyleProfile,
  STYLE_DIMENSIONS,
  type WritingStyleProfile,
} from '../types/style'
import { parseWorldBookSummary } from './worldbookProtocol'
import type { WorldBookSummary } from '../types/worldbook'

/**
 * 创建一个"设定集风格"的文风配置，用于非叙事性文本（设定集、规则文档等）。
 * 所有维度标记为"设定集风格"，权重保持默认。
 */
export function createSettingDocStyleProfile(): WritingStyleProfile {
  const profile = createDefaultStyleProfile()
  for (const dim of STYLE_DIMENSIONS) {
    profile[dim.key] = { tags: ['设定集风格'], weight: 50 }
  }
  return profile
}

export function parseWritingStyleProfile(
  raw: string,
  options?: { strict?: boolean },
): WritingStyleProfile {
  const strict = options?.strict ?? false
  const trimmed = raw.trim()
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    if (strict) throw new Error('文风参数解析失败，请重试')
    return createDefaultStyleProfile()
  }

  if (!parsed || typeof parsed !== 'object') {
    if (strict) throw new Error('文风数据无效，请重试')
    return createDefaultStyleProfile()
  }

  const record = parsed as Record<string, unknown>
  const profile = createDefaultStyleProfile()
  let validDimensions = 0

  for (const dim of STYLE_DIMENSIONS) {
    const item = record[dim.key]
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    const tags = Array.isArray(obj.tags)
      ? obj.tags
          .filter((t): t is string => typeof t === 'string' && !!t.trim())
          .map((t) => t.trim())
          .slice(0, 6)
      : []
    const weight =
      typeof obj.weight === 'number'
        ? clampWeight(obj.weight)
        : profile[dim.key].weight
    if (tags.length > 0) {
      validDimensions++
      profile[dim.key] = { tags, weight }
    } else if (!strict) {
      profile[dim.key] = { ...profile[dim.key], weight }
    }
  }

  if (strict && validDimensions < STYLE_DIMENSIONS.length) {
    throw new Error('文风标签不完整，请重试')
  }

  return profile
}

export function parseCombinedWorldBookResponse(raw: string): {
  summary: WorldBookSummary
  style: WritingStyleProfile
} {
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

  if (record.summary && typeof record.summary === 'object') {
    if (!record.style || typeof record.style !== 'object') {
      throw new Error('AI 未返回文风参数，请重试')
    }
    return {
      summary: parseWorldBookSummary(JSON.stringify(record.summary)),
      style: parseWritingStyleProfile(JSON.stringify(record.style), {
        strict: true,
      }),
    }
  }

  return {
    summary: parseWorldBookSummary(jsonText),
    style: parseWritingStyleProfile(jsonText, { strict: true }),
  }
}

function clampWeight(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}
