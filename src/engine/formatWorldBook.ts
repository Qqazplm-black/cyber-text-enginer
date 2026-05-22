import type { WorldBookSummary } from '../types/worldbook'

export function formatWorldBookForPrompt(summary: WorldBookSummary): string {
  return [
    '【世界观】',
    summary.worldview,
    '',
    '【人物】',
    summary.characters,
    '',
    '【势力】',
    summary.factions,
    '',
    '【规则】',
    summary.rules,
  ].join('\n')
}
