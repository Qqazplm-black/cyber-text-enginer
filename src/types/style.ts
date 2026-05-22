export type StyleDimensionKey =
  | 'scene'
  | 'action'
  | 'psychology'
  | 'dialogue'
  | 'tone'
  | 'actionStyle'
  | 'psychologyWeight'
  | 'dialogueStyle'
  | 'narrativeTone'

export type StyleDimension = {
  key: StyleDimensionKey
  label: string
  description: string
}

export const STYLE_DIMENSIONS: StyleDimension[] = [
  {
    key: 'scene',
    label: '场景描写',
    description: '环境、氛围、感官细节的书写方式',
  },
  {
    key: 'action',
    label: '动作描写',
    description: '人物行为与场面调度的叙述风格',
  },
  {
    key: 'psychology',
    label: '心理描写',
    description: '内心独白与情绪刻画比重',
  },
  {
    key: 'dialogue',
    label: '对话风格',
    description: '角色台词的节奏、语气与用词',
  },
  {
    key: 'tone',
    label: '叙事基调',
    description: '整体故事的语气与情感走向',
  },
  {
    key: 'actionStyle',
    label: '动作描写风格',
    description: '打斗/追逐/日常动作的节奏与细腻程度',
  },
  {
    key: 'psychologyWeight',
    label: '心理描写权重',
    description: '内心独白与情绪变化的篇幅占比',
  },
  {
    key: 'dialogueStyle',
    label: '对话风格',
    description: '台词的口语化程度、修辞风格与潜台词运用',
  },
  {
    key: 'narrativeTone',
    label: '整体叙事基调',
    description: '故事的冷热色调、幽默感与文学性程度',
  },
]

export type StyleDimensionProfile = {
  tags: string[]
  weight: number
}

export type WritingStyleProfile = Record<
  StyleDimensionKey,
  StyleDimensionProfile
>

export function createDefaultStyleProfile(): WritingStyleProfile {
  return {
    scene: { tags: ['写实'], weight: 50 },
    action: { tags: ['简洁'], weight: 50 },
    psychology: { tags: ['克制'], weight: 50 },
    dialogue: { tags: ['自然'], weight: 50 },
    tone: { tags: ['中性'], weight: 50 },
    actionStyle: { tags: ['利落'], weight: 50 },
    psychologyWeight: { tags: ['适中'], weight: 50 },
    dialogueStyle: { tags: ['自然'], weight: 50 },
    narrativeTone: { tags: ['中性'], weight: 50 },
  }
}
