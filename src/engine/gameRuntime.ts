import type { CompiledGame, GameRuntimeStats, SceneChoice } from '../types/genesis'

export const DEFAULT_GAME_STATS = [
  { key: 'hp', label: '生命值', initial: 100, max: 100 },
  { key: 'sanity', label: '理智值', initial: 100, max: 100 },
] as const

export function createInitialStats(game: CompiledGame): GameRuntimeStats {
  return Object.fromEntries(
    game.stats.map((s) => [s.key, s.initial]),
  )
}

export function applyChoiceEffects(
  current: GameRuntimeStats,
  game: CompiledGame,
  effects?: Record<string, number>,
): GameRuntimeStats {
  if (!effects) return current

  const next = { ...current }
  for (const [key, delta] of Object.entries(effects)) {
    const def = game.stats.find((s) => s.key === key)
    if (!def || typeof delta !== 'number') continue
    const value = (next[key] ?? def.initial) + delta
    next[key] = Math.max(0, Math.min(def.max, value))
  }
  return next
}

export function normalizeChoiceEffects(
  choice: SceneChoice,
): Record<string, number> | undefined {
  if (!choice.effects || typeof choice.effects !== 'object') return undefined
  const effects: Record<string, number> = {}
  for (const [key, value] of Object.entries(choice.effects)) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      effects[key] = value
    }
  }
  return Object.keys(effects).length > 0 ? effects : undefined
}

export function applyStatDeltas(
  current: GameRuntimeStats,
  game: CompiledGame,
  deltas?: Record<string, number>,
): GameRuntimeStats {
  if (!deltas) return current
  return applyChoiceEffects(current, game, deltas)
}

export function clampStats(
  stats: GameRuntimeStats,
  game: CompiledGame,
): GameRuntimeStats {
  const next = { ...stats }
  for (const def of game.stats) {
    const value = next[def.key] ?? def.initial
    next[def.key] = Math.max(0, Math.min(def.max, value))
  }
  return next
}

export function isGameOver(
  stats: GameRuntimeStats,
  game: CompiledGame,
): boolean {
  return game.stats.some((def) => (stats[def.key] ?? def.initial) <= 0)
}
