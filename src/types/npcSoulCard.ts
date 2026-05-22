/** NPC 灵魂卡 - 创世AI在后台自动生成，玩家不可见 */
export type NpcRelationship = {
  trust: number    // 0～100，信任度
  attitude: number // 0～100，好感度
  memory: NpcMemoryEntry[]
}

export type NpcMemoryEntry = {
  turn: number
  playerAction: string
  impact: string
}

export type NpcSoulCard = {
  /** 角色名 */
  name: string
  /** 世界中的身份 */
  role: string
  /** 性格内核（3个关键词） */
  personality_core: string[]
  /** 这辈子最想得到的东西 */
  deepest_desire: string
  /** 最不能承受失去的东西 */
  deepest_fear: string
  /** 触碰会有真实后果的红线 */
  bottom_line: string
  /** 容易被击中的软肋 */
  weakness: string
  /** 与玩家的关系状态 */
  relationship: NpcRelationship
  /** NPC背后真正在追求的目标 */
  hidden_agenda: string
  /** 玩家不知道的NPC当前行动 */
  current_action: string
  /**
   * 重要性权重（1-10）
   * 核心人物（主要盟友/对立面/情感羁绊）8-10
   * 次要人物（功能性NPC/信息提供者）4-7
   * 路人NPC 1-3
   */
  weight: number
}

/** 灵魂卡集合，key为NPC名称 */
export type NpcSoulCardMap = Record<string, NpcSoulCard>
