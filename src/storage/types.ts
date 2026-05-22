import type {
  CompiledGame,
  EndingType,
  GameRuntimeStats,
  GenesisPersonality,
  PlayChoiceOption,
  StoryBeat,
} from '../types/genesis'
import type { NpcSoulCardMap } from '../types/npcSoulCard'
import type { WritingStyleProfile } from '../types/style'
import type { WorldBookSummary } from '../types/worldbook'

export type GameHistoryEntry = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  game: CompiledGame
  worldBook: WorldBookSummary | null
  style: WritingStyleProfile | null
  personality: GenesisPersonality | null
  shareSlug?: string
}

export type GameSaveSlot = {
  gameId: string
  title: string
  savedAt: number
  stats: GameRuntimeStats
  narrative: string
  choices: PlayChoiceOption[]
  history: StoryBeat[]
  showIntro: boolean
  ended: boolean
  endingType: EndingType | null
  endingMessage: string | null
  worldBook?: WorldBookSummary | null
  style?: WritingStyleProfile | null
  wordCountMode?: string
  /** 开场白是否已生成 */
  openingGenerated?: boolean
  /** 开场白叙事文本 */
  openingNarrative?: string
  /** 开场白选项 */
  openingChoices?: PlayChoiceOption[]
  /** NPC灵魂卡（含权重数据） */
  npcSoulCards?: NpcSoulCardMap
  /** 回合计数器（用于权重衰减判断） */
  turnCount?: number
}

export type ShareBundle = {
  v: 1
  game: CompiledGame
  worldBook: WorldBookSummary | null
  style: WritingStyleProfile | null
}
