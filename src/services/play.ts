import type {
  CompiledGame,
  GameRuntimeStats,
  OpeningResponse,
  PlayTurnResponse,
  StoryBeat,
} from '../types/genesis'
import type { NpcSoulCardMap, NpcMemoryEntry } from '../types/npcSoulCard'
import type { WritingStyleProfile } from '../types/style'
import type { WorldBookSummary } from '../types/worldbook'
import { requestLlmParsed } from './llm/client'
import type { LlmConfig } from './llm/types'
import { buildPlaySystemPrompt, buildPlayUserMessage, type WordCountMode } from './playPrompt'
import { buildOpeningPrompt } from './playOpeningPrompt'
import { parsePlayTurnResponse, parseOpeningResponse } from './playProtocol'

export async function playStoryTurn(
  config: LlmConfig,
  game: CompiledGame,
  stats: GameRuntimeStats,
  history: StoryBeat[],
  playerChoice: string,
  worldBook?: WorldBookSummary | null,
  style?: WritingStyleProfile | null,
  wordCountMode?: WordCountMode | null,
): Promise<PlayTurnResponse> {
  return requestLlmParsed(
    config,
    [
      {
        role: 'system',
        content: buildPlaySystemPrompt(game, worldBook, style, wordCountMode),
      },
      {
        role: 'user',
        content: buildPlayUserMessage(stats, history, playerChoice),
      },
    ],
    parsePlayTurnResponse,
    0.85,
  )
}

/**
 * 更新NPC灵魂卡的关系数据（每回合结束后调用）
 * 根据玩家行为自动调整 trust、attitude 并记录 memory
 *
 * @param soulCards 当前的灵魂卡集合
 * @param turnNumber 当前回合数
 * @param playerAction 玩家本回合的行为描述
 * @param impact 该行为对NPC的影响描述（正面/负面）
 * @param trustDelta trust变化量（-20～+20）
 * @param attitudeDelta attitude变化量（-20～+20）
 * @returns 更新后的灵魂卡集合（浅拷贝新对象）
 */
export function updateNpcRelationship(
  soulCards: NpcSoulCardMap,
  turnNumber: number,
  npcName: string,
  playerAction: string,
  impact: string,
  trustDelta: number,
  attitudeDelta: number,
): NpcSoulCardMap {
  const card = soulCards[npcName]
  if (!card) return soulCards

  const updated: NpcSoulCardMap = { ...soulCards }
  const oldCard = updated[npcName]

  const newTrust = Math.max(0, Math.min(100, oldCard.relationship.trust + trustDelta))
  const newAttitude = Math.max(0, Math.min(100, oldCard.relationship.attitude + attitudeDelta))

  const memoryEntry: NpcMemoryEntry = {
    turn: turnNumber,
    playerAction,
    impact,
  }

  updated[npcName] = {
    ...oldCard,
    relationship: {
      trust: newTrust,
      attitude: newAttitude,
      memory: [...oldCard.relationship.memory, memoryEntry],
    },
  }

  return updated
}

/**
 * 批量更新多个NPC的灵魂卡关系数据
 */
export function updateNpcRelationships(
  soulCards: NpcSoulCardMap,
  turnNumber: number,
  updates: Array<{
    npcName: string
    playerAction: string
    impact: string
    trustDelta: number
    attitudeDelta: number
  }>,
): NpcSoulCardMap {
  let current = soulCards
  for (const update of updates) {
    current = updateNpcRelationship(
      current,
      turnNumber,
      update.npcName,
      update.playerAction,
      update.impact,
      update.trustDelta,
      update.attitudeDelta,
    )
  }
  return current
}

/**
 * NPC 权重动态调整（每回合结束后调用）
 * 规则：
 * - 玩家主动与某NPC互动或做出影响该NPC的决定，权重+1（上限10）
 * - 玩家连续3回合未涉及某NPC，权重-1（下限1）
 *
 * @param soulCards 当前的灵魂卡集合
 * @param interactedNpcNames 本回合玩家互动过的NPC名称列表
 * @param turnNumber 当前回合数
 * @returns 更新后的灵魂卡集合（浅拷贝新对象）
 */
export function updateNpcWeights(
  soulCards: NpcSoulCardMap,
  interactedNpcNames: string[],
  turnNumber: number,
): NpcSoulCardMap {
  const updated: NpcSoulCardMap = { ...soulCards }
  const interactedSet = new Set(interactedNpcNames)

  for (const [key, card] of Object.entries(soulCards)) {
    const newCard = { ...card, relationship: { ...card.relationship } }

    if (interactedSet.has(card.name)) {
      // 玩家主动互动，权重+1（上限10）
      newCard.weight = Math.min(10, card.weight + 1)
    } else {
      // 检查是否连续3回合未涉及
      const lastMentionedTurn = findLastMentionedTurn(card, turnNumber)
      if (lastMentionedTurn !== null && turnNumber - lastMentionedTurn >= 3) {
        newCard.weight = Math.max(1, card.weight - 1)
      }
    }

    updated[key] = newCard
  }

  return updated
}

/**
 * 查找NPC最后一次被玩家提及的回合数
 * 通过检查memory中的最新记录来判断
 */
function findLastMentionedTurn(
  card: import('../types/npcSoulCard').NpcSoulCard,
  currentTurn: number,
): number | null {
  if (card.relationship.memory.length === 0) return null
  // 取memory中最近的turn
  const lastTurn = card.relationship.memory[card.relationship.memory.length - 1].turn
  return lastTurn
}

/**
 * 生成开场白
 * 创世完成后进入游玩界面时调用，AI首先生成一段高质量开场白
 */
export async function generateOpeningScene(
  config: LlmConfig,
  game: CompiledGame,
  worldBook?: WorldBookSummary | null,
  style?: WritingStyleProfile | null,
): Promise<OpeningResponse> {
  return requestLlmParsed(
    config,
    [
      {
        role: 'system',
        content: buildOpeningPrompt(game, worldBook, style),
      },
      {
        role: 'user',
        content: '请生成开场白。',
      },
    ],
    parseOpeningResponse,
    0.9,
  )
}
