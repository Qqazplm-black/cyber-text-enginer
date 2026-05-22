import type { CompiledGame } from '../types/genesis'

/** 将编译后的游戏规格格式化为可读的规则文本 */
export function formatGameRules(game: CompiledGame): string {
  const lines: string[] = [
    `标题：${game.title}`,
    '',
    '【开场】',
    game.intro,
    '',
    `【起始场景】${game.startScene}`,
    '',
    '【状态变量】',
    ...game.stats.map((s) => `  ${s.label}（${s.key}）：${s.initial}/${s.max}`),
    '',
    '【场景与分支】',
  ]

  for (const [id, scene] of Object.entries(game.scenes)) {
    lines.push('')
    lines.push(`■ ${id}`)
    lines.push(scene.text)
    if (scene.choices.length > 0) {
      for (const choice of scene.choices) {
        const target =
          choice.next === 'END' ? '结局' : choice.next
        const fx =
          choice.effects && Object.keys(choice.effects).length > 0
            ? `，效果：${Object.entries(choice.effects)
                .map(([k, v]) => `${k}${v >= 0 ? '+' : ''}${v}`)
                .join(' ')}`
            : ''
        lines.push(`  → ${choice.label}（前往：${target}${fx}）`)
      }
    } else {
      lines.push('  （结局场景）')
    }
  }

  return lines.join('\n').trim()
}
