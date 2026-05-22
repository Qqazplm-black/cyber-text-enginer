import type { NpcSoulCardMap } from '../types/npcSoulCard'

/**
 * 将NPC灵魂卡集合格式化为prompt文本（供AI推理使用，不展示给玩家）
 */
export function formatNpcSoulCardsForPrompt(cards: NpcSoulCardMap): string {
  const entries = Object.values(cards)
  if (entries.length === 0) return ''

  return entries
    .map((card) => {
      const weightLabel =
        card.weight >= 8
          ? '核心人物'
          : card.weight >= 5
            ? '次要人物'
            : '路人NPC'
      return [
        `--- ${card.name}（${card.role}）---`,
        `重要性权重：${card.weight}/10（${weightLabel}）`,
        `性格内核：${card.personality_core.join('、')}`,
        `最深渴望：${card.deepest_desire}`,
        `最深恐惧：${card.deepest_fear}`,
        `红线：${card.bottom_line}`,
        `软肋：${card.weakness}`,
        `信任度：${card.relationship.trust}/100`,
        `好感度：${card.relationship.attitude}/100`,
        `隐藏 agenda：${card.hidden_agenda}`,
        `当前暗中行动：${card.current_action}`,
        card.relationship.memory.length > 0
          ? `记忆事件：\n${card.relationship.memory
              .map(
                (m) =>
                  `  - [第${m.turn}回合] ${m.playerAction} → ${m.impact}`,
              )
              .join('\n')}`
          : '记忆事件：（暂无）',
      ].join('\n')
    })
    .join('\n\n')
}
