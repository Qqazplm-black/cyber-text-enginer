import type { GameHistoryEntry } from './types'

const STORAGE_KEY = 'genesis_game_history'

export function listGameHistory(): GameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as GameHistoryEntry[]
    return list.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export function getGameHistory(id: string): GameHistoryEntry | null {
  return listGameHistory().find((e) => e.id === id) ?? null
}

export function upsertGameHistory(entry: GameHistoryEntry): void {
  const list = listGameHistory().filter((e) => e.id !== entry.id)
  list.unshift(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)))
}

export function removeGameHistory(id: string): void {
  const list = listGameHistory().filter((e) => e.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function createHistoryId(): string {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
