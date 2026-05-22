import {
  DEFAULT_GAME_STATS,
  normalizeChoiceEffects,
} from './gameRuntime'
import type {
  CompiledGame,
  GameSpec,
  GameStatDef,
} from '../types/genesis'

export class GameCompileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GameCompileError'
  }
}

export function compileGame(spec: GameSpec): CompiledGame {
  if (!spec.title?.trim()) {
    throw new GameCompileError('游戏缺少标题')
  }

  if (!spec.intro?.trim()) {
    throw new GameCompileError('游戏缺少开场介绍')
  }

  if (!spec.startScene?.trim()) {
    throw new GameCompileError('游戏缺少起始场景')
  }

  const scenes = spec.scenes
  if (!scenes || typeof scenes !== 'object' || Object.keys(scenes).length < 3) {
    throw new GameCompileError('游戏至少需要 3 个场景')
  }

  if (!scenes[spec.startScene]) {
    throw new GameCompileError(`起始场景「${spec.startScene}」不存在`)
  }

  for (const [id, scene] of Object.entries(scenes)) {
    if (!scene.text?.trim()) {
      throw new GameCompileError(`场景「${id}」缺少描述文本`)
    }

    if (!Array.isArray(scene.choices)) {
      throw new GameCompileError(`场景「${id}」选项格式无效`)
    }

    for (const choice of scene.choices) {
      if (!choice.label?.trim()) {
        throw new GameCompileError(`场景「${id}」存在空选项`)
      }
      if (!choice.next?.trim()) {
        throw new GameCompileError(`场景「${id}」选项缺少跳转目标`)
      }
      const next = choice.next.trim()
      if (next !== 'END' && !scenes[next]) {
        throw new GameCompileError(
          `场景「${id}」的选项指向不存在的场景「${next}」`,
        )
      }
    }
  }

  const reachable = new Set<string>()
  const queue = [spec.startScene]
  while (queue.length > 0) {
    const id = queue.pop()!
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const choice of scenes[id].choices) {
      const next = choice.next.trim()
      if (next !== 'END' && scenes[next] && !reachable.has(next)) {
        queue.push(next)
      }
    }
  }

  if (reachable.size < 3) {
    throw new GameCompileError('场景之间缺少有效的分支连接')
  }

  return {
    title: spec.title.trim(),
    intro: spec.intro.trim(),
    startScene: spec.startScene.trim(),
    stats: normalizeStats(spec.stats),
    npcSoulCards: spec.npcSoulCards,
    scenes: Object.fromEntries(
      Object.entries(scenes).map(([id, scene]) => [
        id,
        {
          text: scene.text.trim(),
          choices: scene.choices.map((c) => ({
            label: c.label.trim(),
            next: c.next.trim(),
            effects: normalizeChoiceEffects(c),
          })),
        },
      ]),
    ),
  }
}

function normalizeStats(raw?: GameStatDef[]): GameStatDef[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_GAME_STATS.map((s) => ({ ...s }))
  }

  const stats: GameStatDef[] = []
  for (const item of raw) {
    if (!item?.key?.trim() || !item?.label?.trim()) continue
    const initial = clampStatNumber(item.initial, 100)
    const max = clampStatNumber(item.max, 100, initial)
    stats.push({
      key: item.key.trim(),
      label: item.label.trim(),
      initial: Math.min(initial, max),
      max,
    })
  }

  return stats.length > 0
    ? stats
    : DEFAULT_GAME_STATS.map((s) => ({ ...s }))
}

function clampStatNumber(
  value: unknown,
  fallback: number,
  floor = 1,
): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(floor, Math.round(value))
}
