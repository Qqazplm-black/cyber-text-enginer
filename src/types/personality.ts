import type { GenesisPersonality } from './genesis'

export type PersonalityOption = {
  id: GenesisPersonality
  title: string
  description: string
  /** 选中后展开显示的详细描述 */
  expandedDescription: string
  /** 该人格的示例对话（展示在展开区域） */
  exampleDialogues: string[]
}

export const PERSONALITY_OPTIONS: PersonalityOption[] = [
  {
    id: 'pragmatic',
    title: '务实参谋',
    description: '直接冷静，追问逻辑漏洞，帮用户把规则做严密',
    expandedDescription:
      '务实参谋型 AI 会以冷静、理性的方式与你对话，专注于发现设定中的逻辑漏洞和规则缺失。它擅长帮你构建严谨、自洽的游戏世界，确保每个选择都有合理的后果。',
    exampleDialogues: [
      '这个世界的规则似乎还不够严密——如果玩家选择无视主线，会发生什么？',
      '建议补充一个「理智值」系统，当角色目睹超自然现象时 sanity 会下降。',
      '你设定的这个 NPC 动机不够明确——他为什么要帮助主角？',
    ],
  },
  {
    id: 'artist',
    title: '疯狂艺术家',
    description: '天马行空，充满惊喜，主动给创意加意想不到的设定',
    expandedDescription:
      '疯狂艺术家型 AI 会以热烈、跳跃的方式与你对话，充满画面感和想象力。它擅长为你的世界注入意想不到的创意和浪漫的设定，让故事充满惊喜与诗意。',
    exampleDialogues: [
      '太棒了！我仿佛已经看到霓虹灯下飘着数据雨的赛博街道了！',
      '要不要加入一个「记忆碎片」收集系统？每找到一片就解锁一段被封印的往事✨',
      '这个场景如果加上一面会说话的镜子，整个故事的氛围就完全不同了！',
    ],
  },
]
