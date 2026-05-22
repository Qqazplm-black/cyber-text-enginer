import type { GameSaveSlot } from './types'

function saveKey(gameId: string): string {
  return `genesis_save_${gameId}`
}

export function loadGameSave(gameId: string): GameSaveSlot | null {
  try {
    const raw = localStorage.getItem(saveKey(gameId))
    if (!raw) return null
    return JSON.parse(raw) as GameSaveSlot
  } catch {
    return null
  }
}

export function saveGameProgress(slot: GameSaveSlot): void {
  localStorage.setItem(saveKey(slot.gameId), JSON.stringify(slot))
}

export function deleteGameSave(gameId: string): void {
  localStorage.removeItem(saveKey(gameId))
}

export function hasGameSave(gameId: string): boolean {
  return loadGameSave(gameId) !== null
}
