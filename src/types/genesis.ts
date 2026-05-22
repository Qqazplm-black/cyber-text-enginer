import type { NpcSoulCardMap } from './npcSoulCard'

export type SceneChoice = {
  label: string
  next: string
  /** 选项对状态变量的影响，如 { "hp": -10, "sanity": 5 } */
  effects?: Record<string, number>
}

export type GameScene = {
  text: string
  choices: SceneChoice[]
}

export type GameStatDef = {
  key: string
  label: string
  initial: number
  max: number
}

export type GameSpec = {
  title: string
  intro: string
  startScene: string
  scenes: Record<string, GameScene>
  stats?: GameStatDef[]
  /** NPC灵魂卡集合（创世AI自动生成，玩家不可见） */
  npcSoulCards?: NpcSoulCardMap
}

export type GameRuntimeStats = Record<string, number>

export type GenesisStatus = 'gathering' | 'complete'

export type GenesisResponse = {
  status: GenesisStatus
  message: string
  game: GameSpec | null
}

export type ChatRole = 'user' | 'assistant'

export type DisplayMessage = {
  id: string
  role: ChatRole
  content: string
}

export type SessionPhase =
  | 'welcome'
  | 'chatting'
  | 'compiling'
  | 'complete'
  | 'playing'

export type CompiledGame = GameSpec & {
  stats: GameStatDef[]
}

/** 创世 AI 人格 */
export type GenesisPersonality = 'pragmatic' | 'artist'

export type PlayChoiceOption = {
  label: string
  effects?: Record<string, number>
}

export type EndingType =
  | 'victory'
  | 'defeat'
  | 'neutral'
  | 'bad_end'
  | 'secret'

export type PlayTurnResponse = {
  narrative: string
  choices: PlayChoiceOption[]
  statDeltas?: Record<string, number>
  ended: boolean
  endingType?: EndingType | null
  endingMessage?: string
}

export const ENDING_META: Record<
  EndingType,
  { title: string; subtitle: string; className: string }
> = {
  victory: {
    title: '胜利结局',
    subtitle: '你达成了目标，故事以荣光收束。',
    className: 'ending--victory',
  },
  defeat: {
    title: '失败结局',
    subtitle: '局势崩坏，旅程在此止步。',
    className: 'ending--defeat',
  },
  neutral: {
    title: '平凡结局',
    subtitle: '没有轰轰烈烈的终章，只有平静的落幕。',
    className: 'ending--neutral',
  },
  bad_end: {
    title: '坏结局',
    subtitle: '选择带来不可挽回的后果。',
    className: 'ending--bad',
  },
  secret: {
    title: '隐藏结局',
    subtitle: '你触发了极少人见过的分支。',
    className: 'ending--secret',
  },
}

export type StoryBeat = {
  playerChoice?: string
  narrative: string
}

/** 开场白生成响应 */
export type OpeningResponse = {
  narrative: string
  choices: PlayChoiceOption[]
}
