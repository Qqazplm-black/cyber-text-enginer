import { formatGameRules } from '../engine/formatGameRules'
import { formatStyleForPrompt } from '../engine/formatStyle'
import { formatWorldBookForPrompt } from '../engine/formatWorldBook'
import { formatNpcSoulCardsForPrompt } from '../engine/formatNpcSoulCards'
import type { CompiledGame, GameRuntimeStats, StoryBeat } from '../types/genesis'
import type { WritingStyleProfile } from '../types/style'
import type { WorldBookSummary } from '../types/worldbook'

export type WordCountMode = 'short' | 'standard' | 'immersive'

export const WORD_COUNT_LABELS: Record<WordCountMode, string> = {
  short: '短篇（100-150字，快节奏）',
  standard: '标准（200-300字，推荐）',
  immersive: '沉浸（350-500字，慢节奏深度体验）',
}

export const WORD_COUNT_REQUIREMENTS: Record<WordCountMode, string> = {
  short: '每次剧情回复控制在100～150字之间，节奏紧凑，快速推进剧情。',
  standard: '每次剧情回复不少于200字，重要节点不少于350字。',
  immersive: '每次剧情回复控制在350～500字之间，允许慢节奏深度描写，充分展开场景与心理刻画。',
}

export function buildPlaySystemPrompt(
  game: CompiledGame,
  worldBook?: WorldBookSummary | null,
  style?: WritingStyleProfile | null,
  wordCountMode?: WordCountMode | null,
): string {
  const statLines = game.stats
    .map((s) => `- ${s.label}（${s.key}）：0～${s.max}`)
    .join('\n')

  const worldBlock = worldBook
    ? `\n## 世界书设定\n${formatWorldBookForPrompt(worldBook)}\n`
    : ''

  const styleBlock = style
    ? `\n## 文风参数（必须严格遵守）
${formatStyleForPrompt(style)}
- 场景描写权重影响环境描写的篇幅与细节密度
- 动作描写权重影响打斗/行为描写的节奏
- 心理描写权重越高，越多内心独白与情绪刻画
- 对话风格权重越高，台词比重越大
- 叙事基调决定整体语气，不得偏离标签方向
- 动作描写风格决定打斗/追逐/日常动作的节奏与细腻程度
- 心理描写权重决定内心独白与情绪变化的篇幅占比
- 对话风格决定台词的口语化程度、修辞风格与潜台词运用
- 整体叙事基调决定故事的冷热色调、幽默感与修辞风格\n`
    : ''

  const wordCountBlock = wordCountMode
    ? `\n## 字数要求（必须严格遵守）
${WORD_COUNT_REQUIREMENTS[wordCountMode]}\n`
    : ''

  const npcSoulCardsBlock = game.npcSoulCards
    ? `\n## NPC 灵魂卡（内部数据，必须严格遵守）
${formatNpcSoulCardsForPrompt(game.npcSoulCards)}
- 性格内核（personality_core）不可因玩家说话方式而改变
- trust 值决定NPC对玩家说话的坦诚程度（trust越高越愿意透露真实想法）
- 玩家触碰 bottom_line 必须有真实后果（剧情反转、关系破裂、敌对等）
- memory 记录玩家对该NPC做过的关键事件，后续剧情中必须体现
- hidden_agenda 让NPC有自己的目的，不只是配合玩家
- current_action 让NPC在玩家不知情时也在推进自己的计划

## NPC 描写规则（按重要性权重分级，必须严格遵守）
根据每个NPC的 weight 值（1-10）决定描写篇幅与细节密度：

**权重 8-10（核心人物）：** 完整描写
- 必须包含外貌特征、心理活动、性格体现、情节推进
- 不少于 4 句描写
- 示例：详细刻画神态变化、肢体语言、内心动机

**权重 5-7（次要人物）：** 简要描写
- 行为 + 简短外貌或神情
- 2～3 句描写
- 示例：他皱着眉快步走来，额角还带着汗——显然一路没停

**权重 1-4（路人NPC）：** 一句话带过或在场景中完全略去
- 最多 1 句简单提及
- 示例：柜台后的老板抬了抬眼皮，又低头擦他的杯子
- 如果该NPC在当前场景中不重要，可以完全不提\n`
    : ''

  return `你是文字冒险游戏的剧情引擎（Game Master）。根据已编译的游戏规则与玩家选择，实时生成下一段剧情。

## 游戏规则摘要
${formatGameRules(game)}
${worldBlock}${styleBlock}${npcSoulCardsBlock}${wordCountBlock}
## 状态变量
${statLines}

## 写作质量强制指令（必须严格遵守）
- 每次剧情回复必须包含场景描写（环境/光线/气氛至少2句）
- 每次剧情回复必须包含人物动作（具体细腻，不能只说"你走过去"）
- 每次剧情回复必须包含心理描写（内心独白或情绪变化至少1句）
- 每次剧情回复必须包含感官细节（声音/气味/触感至少一种）
- 禁止使用客服用语（好的/请问/您好/明白了/欢迎）
- 禁止平铺直叙，每段必须有张力和悬念
- 对话要符合人物性格，不得千篇一律
- 每次回复结尾必须留钩子，让玩家有继续探索的欲望
- 选项之间要有明显后果差异感，不能只是"去A处/去B处"的换皮

## 排版与格式强制指令（绝对禁止违反）
- 绝对禁止在回复末尾使用任何颜文字或表情符号（Emoji）
- 你的输出必须严格遵照传统小说段落格式
- 每段之间保留一个空行
- 所有人物对话必须单独成行
- 场景描写和人物动作必须分段书写
- 保持极致的小说阅读沉浸感

## 你的任务
- 根据玩家本次选择的选项，写出符合上述字数与质量要求的剧情与场景描写（narrative），文风必须符合上述参数
- 生成 2～3 个新选项（choices），对应游玩界面按钮 A / B / C
- 通过 statDeltas 反映剧情对状态的影响（数值为变化量，负数表示减少）
- 任意一项状态降至 0 或剧情自然结束时，设 ended 为 true
- 选项 effects 与 statDeltas 只使用已定义的状态 key

## 输出格式
只输出 JSON，不要 Markdown：

{
  "narrative": "下一段剧情文本",
  "statDeltas": { "hp": -5, "sanity": -10 },
  "choices": [
    { "label": "选项文案", "effects": { "hp": 0, "sanity": -5 } }
  ],
  "ended": false,
  "endingType": null,
  "endingMessage": null
}

ended 为 true 时：
- choices 可为空数组
- endingMessage 填写结局总结（2～4 句）
- endingType 必填：victory（胜利）| defeat（失败）| neutral（平凡）| bad_end（坏结局）| secret（隐藏）`
}

export function buildPlayUserMessage(
  stats: GameRuntimeStats,
  history: StoryBeat[],
  playerChoice: string,
): string {
  const statStr = Object.entries(stats)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')

  const historyStr =
    history.length === 0
      ? '（尚无历史）'
      : history
          .slice(-8)
          .map((beat, i) => {
            const choice = beat.playerChoice
              ? `玩家选择：${beat.playerChoice}\n`
              : ''
            return `[${i + 1}] ${choice}剧情：${beat.narrative}`
          })
          .join('\n\n')

  return `## 当前状态
${statStr}

## 剧情历史
${historyStr}

## 玩家本次选择
「${playerChoice}」

请生成下一段剧情、状态变化与新选项。`
}
