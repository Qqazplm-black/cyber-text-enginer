/** 世界书结构化摘要 */
export type WorldBookSummary = {
  worldview: string
  characters: string
  factions: string
  rules: string
}

export type WorldBookPanelPhase =
  | 'input'
  | 'extracting'
  | 'review'
  | 'confirmed'
