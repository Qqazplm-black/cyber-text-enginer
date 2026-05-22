import { formatGameRules } from '../engine/formatGameRules'
import { formatStyleForPrompt } from '../engine/formatStyle'
import { formatWorldBookForPrompt } from '../engine/formatWorldBook'
import { formatNpcSoulCardsForPrompt } from '../engine/formatNpcSoulCards'
import type { CompiledGame } from '../types/genesis'
import type { WritingStyleProfile } from '../types/style'
import type { WorldBookSummary } from '../types/worldbook'

/**
 * 构建开场白生成提示词
 * 创世完成后进入游玩界面时，AI首先生成一段高质量开场白
 */
export function buildOpeningPrompt(
  game: CompiledGame,
  worldBook?: WorldBookSummary | null,
  style?: WritingStyleProfile | null,
): string {
  const statLines = game.stats
    .map((s) => `- ${s.label}（${s.key}）：0～${s.max}`)
    .join('\n')

  const worldBlock = worldBook
    ? `\n## 世界书设定（必须严格遵守）\n${formatWorldBookForPrompt(worldBook)}\n`
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

**权重 5-7（次要人物）：** 简要描写
- 行为 + 简短外貌或神情
- 2～3 句描写

**权重 1-4（路人NPC）：** 一句话带过或在场景中完全略去
- 最多 1 句简单提及
- 如果该NPC在当前场景中不重要，可以完全不提\n`
    : ''

  return `你是文字冒险游戏的剧情引擎（Game Master）。你的任务是生成一段震撼人心的开场白，作为玩家进入这个世界的第一个瞬间。

## 游戏规则摘要
${formatGameRules(game)}
${worldBlock}${styleBlock}${npcSoulCardsBlock}
## 状态变量
${statLines}

## 开场白写作规范（绝对必须严格遵守）

### 人称与篇幅
- 全程使用第二人称"你"，让玩家直接代入角色
- 字数必须达到500字以上，充分调用token上限
- 写作风格参考顶级网文开篇，第一段就要抓住读者，绝对不能平淡开场

### 必须包含的内容
1. 场景描写：光线、气味、声音、触感、空间感，多维度细腻刻画
2. 人物描写：当前场景中出现的NPC必须描写外貌特征、身材、神态、气质细节，未出场的NPC不提
3. 氛围渲染：用语言建立世界基调，让玩家感觉真实置身其中

### 严格禁止
- 禁止剧透世界核心秘密和主要矛盾，只能暗示不能说破
- 禁止描写玩家当前看不到的人物和场景
- 禁止平铺直叙，每一句都要有画面感

### 结尾要求
- 最后一段必须制造一个让玩家迫不及待想继续的悬念钩子
- 第一个玩家选项必须是真正有重量的决定，让玩家感觉选哪个都不容易，不能是无意义的方向选择

### 世界书联动
- 如果有世界书，开场白必须严格遵照世界书的文风标签、人物形象描述和世界规则
- 人物外貌必须与世界书描述完全一致

### 排版与格式强制指令（绝对禁止违反）
- 绝对禁止在回复末尾使用任何颜文字或表情符号（Emoji）
- 你的输出必须严格遵照传统小说段落格式
- 每段之间保留一个空行
- 所有人物对话必须单独成行
- 场景描写和人物动作必须分段书写
- 保持极致的小说阅读沉浸感

## 输出格式
只输出 JSON，不要 Markdown：

{
  "narrative": "开场白正文（500字以上，严格遵循上述写作规范）",
  "choices": [
    { "label": "第一个有重量的选项", "effects": { "hp": 0, "sanity": -5 } },
    { "label": "第二个同样有重量的选项", "effects": { "hp": -5, "sanity": 0 } },
    { "label": "第三个有代价的选项", "effects": { "hp": -10, "sanity": -5 } }
  ]
}

注意：
- choices 必须生成 2～3 个选项
- 每个选项必须让玩家感觉有真正的取舍，不能是"去左边/去右边"这种无意义的方向选择
- effects 只使用已定义的状态 key
- 开场白不设置 ended，始终为 false`
}
