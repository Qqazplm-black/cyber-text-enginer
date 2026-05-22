import type { GenesisResponse } from '../types/genesis'
import type { NpcSoulCardMap } from '../types/npcSoulCard'

export function parseGenesisResponse(raw: string): GenesisResponse {
  const trimmed = raw.trim()
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('创世 AI 返回了无法解析的格式，请重试')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('创世 AI 返回了无效数据')
  }

  const record = parsed as Record<string, unknown>
  const status = record.status
  const message = record.message

  if (status !== 'gathering' && status !== 'complete') {
    throw new Error('创世 AI 状态字段无效')
  }

  if (typeof message !== 'string' || !message.trim()) {
    throw new Error('创世 AI 未返回有效消息')
  }

  const game = record.game
  if (status === 'gathering' && game !== null) {
    throw new Error('收集阶段不应包含游戏数据')
  }

  if (status === 'complete' && (!game || typeof game !== 'object')) {
    throw new Error('完成阶段缺少游戏规格')
  }

  const result: GenesisResponse = {
    status,
    message: message.trim(),
    game: status === 'complete' ? (game as GenesisResponse['game']) : null,
  }

  // 解析NPC灵魂卡（如果存在）
  if (result.game && typeof game === 'object') {
    const gameRecord = game as Record<string, unknown>
    const rawCards = gameRecord.npcSoulCards
    if (rawCards && typeof rawCards === 'object') {
      result.game.npcSoulCards = parseNpcSoulCards(rawCards as Record<string, unknown>)
    }
  }

  return result
}

function parseNpcSoulCards(raw: Record<string, unknown>): NpcSoulCardMap {
  const cards: NpcSoulCardMap = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === 'object') {
      const card = value as Record<string, unknown>
      if (typeof card.name === 'string' && card.name.trim()) {
        cards[key] = {
          name: card.name.trim(),
          role: typeof card.role === 'string' ? card.role.trim() : '',
          personality_core: Array.isArray(card.personality_core)
            ? card.personality_core.filter((p): p is string => typeof p === 'string')
            : [],
          deepest_desire: typeof card.deepest_desire === 'string' ? card.deepest_desire.trim() : '',
          deepest_fear: typeof card.deepest_fear === 'string' ? card.deepest_fear.trim() : '',
          bottom_line: typeof card.bottom_line === 'string' ? card.bottom_line.trim() : '',
          weakness: typeof card.weakness === 'string' ? card.weakness.trim() : '',
          relationship: parseRelationship(card.relationship),
          hidden_agenda: typeof card.hidden_agenda === 'string' ? card.hidden_agenda.trim() : '',
          current_action: typeof card.current_action === 'string' ? card.current_action.trim() : '',
          weight: clampWeight(card.weight),
        }
      }
    }
  }
  return cards
}

function clampWeight(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 5
  return Math.max(1, Math.min(10, Math.round(value)))
}

function parseRelationship(raw: unknown): { trust: number; attitude: number; memory: [] } {
  if (!raw || typeof raw !== 'object') {
    return { trust: 50, attitude: 50, memory: [] }
  }
  const rel = raw as Record<string, unknown>
  return {
    trust: clampNumber(rel.trust, 0, 100, 50),
    attitude: clampNumber(rel.attitude, 0, 100, 50),
    memory: [],
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(min, Math.min(max, Math.round(value)))
}
