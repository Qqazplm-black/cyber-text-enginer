import { formatWorldBookForPrompt } from '../engine/formatWorldBook'
import {
  createDefaultStyleProfile,
  type WritingStyleProfile,
} from '../types/style'
import type { WorldBookSummary } from '../types/worldbook'
import { requestLlmParsed } from './llm/client'
import type { LlmConfig } from './llm/types'
import {
  createSettingDocStyleProfile,
  parseWritingStyleProfile,
} from './styleProtocol'
import {
  WORLDBOOK_EXTRACT_CHUNK_PROMPT,
  WORLDBOOK_MERGE_PROMPT,
} from './worldbookPrompt'
import { parseWorldBookChunk, parseWorldBookSummary } from './worldbookProtocol'

const CHUNK_SIZE = 3000

export type WorldBookExtractResult = {
  summary: WorldBookSummary
  style: WritingStyleProfile
}

/**
 * 第一步：内容提取（处理全文）
 * 将长文本分段处理，每次取 3000 字，多次调用 API，
 * 逐步提取并合并世界观、人物、势力、规则四个维度的信息。
 */
export async function extractWorldBookContent(
  config: LlmConfig,
  sourceText: string,
  onProgress?: (done: number, total: number) => void,
): Promise<WorldBookSummary> {
  const trimmed = sourceText.trim()
  if (!trimmed) {
    throw new Error('世界书内容不能为空')
  }

  // 分段
  const chunks = splitIntoChunks(trimmed, CHUNK_SIZE)
  const total = chunks.length

  // 逐段提取
  const chunkResults: WorldBookSummary[] = []
  for (let i = 0; i < total; i++) {
    onProgress?.(i, total)
    const chunk = chunks[i]
    const result = await requestLlmParsed(
      config,
      [
        { role: 'system', content: WORLDBOOK_EXTRACT_CHUNK_PROMPT },
        {
          role: 'user',
          content: `请从以下文本片段中提取世界观、人物、势力、规则信息（第 ${i + 1}/${total} 段）：\n\n${chunk}`,
        },
      ],
      parseWorldBookChunk,
    )
    chunkResults.push(result)
  }
  onProgress?.(total, total)

  // 如果只有一段，直接返回
  if (total === 1) {
    return chunkResults[0]
  }

  // 多段合并
  const mergedText = chunkResults
    .map(
      (r, i) =>
        `【第 ${i + 1} 段】\n世界观：${r.worldview}\n人物：${r.characters}\n势力：${r.factions}\n规则：${r.rules}`,
    )
    .join('\n\n')

  return requestLlmParsed(
    config,
    [
      { role: 'system', content: WORLDBOOK_MERGE_PROMPT },
      {
        role: 'user',
        content: `请将以下 ${total} 段提取结果合并为一份完整摘要：\n\n${mergedText}`,
      },
    ],
    parseWorldBookSummary,
  )
}

/**
 * 检测文本是否为非叙事性文本（设定集、规则文档等）。
 * 通过检查是否包含叙事性特征（对话、情节、人物动作等）来判断。
 */
function isSettingDoc(text: string): boolean {
  const narrativeIndicators = [
    /[「『""]/,           // 对话引号
    /说[道：:]/,          // "说道/说："
    /[。！？][\n\r]+\s*[「『""]/, // 对话段落
    /(?:他|她|它|他们|她们|它们)\s*(?:说|道|问|答|喊|叫|笑|哭|走|跑|跳|看|望|想|觉得|感到)/,
    /(?:第[一二三四五六七八九十\d]+章|第[一二三四五六七八九十\d]+节)/, // 章节标题
    /[：:][\n\r]+\s*[「『""]/, // 冒号后接对话
  ]

  // 如果文本包含明显的叙事特征，则不是设定集
  let narrativeScore = 0
  for (const pattern of narrativeIndicators) {
    if (pattern.test(text)) {
      narrativeScore++
    }
  }

  // 检查是否有明显的设定集特征（条目式、定义式、规则说明）
  const settingIndicators = [
    /^[#*\-•·]\s/m,           // 列表项
    /(?:设定|规则|定义|说明|概述|简介|背景|世界观)/, // 设定关键词
    /(?:等级|分类|类型|属性|数值|参数|效果|消耗|冷却|范围|距离|时间|地点)/, // 规则关键词
    /^\d+[\.、．]\s/m,        // 编号列表
    /(?:必须|禁止|允许|可以|需要|应当|不得)/, // 规则性用语
  ]

  let settingScore = 0
  for (const pattern of settingIndicators) {
    if (pattern.test(text)) {
      settingScore++
    }
  }

  // 如果叙事特征少且设定特征多，判定为设定集
  return settingScore > narrativeScore && settingScore >= 2
}

/**
 * 第二步：文风分析（只取样本）
 * 只截取文章前 3000 字分析写作风格。
 *
 * 改进：
 * - 自动检测设定集/规则文档，返回"设定集风格"并跳过AI分析
 * - 最多重试1次，失败后自动跳过文风分析，返回默认风格
 * - 不会抛出异常，始终返回一个有效的 WritingStyleProfile
 */
export async function extractWorldBookStyle(
  config: LlmConfig,
  sourceText: string,
): Promise<WritingStyleProfile> {
  const trimmed = sourceText.trim()
  if (!trimmed) {
    return createSettingDocStyleProfile()
  }

  // 只取前 3000 字作为样本
  const sample = trimmed.slice(0, CHUNK_SIZE)

  // 检测是否为设定集/规则文档
  if (isSettingDoc(sample)) {
    return createSettingDocStyleProfile()
  }

  const { STYLE_EXTRACT_PROMPT } = await import('./stylePrompt')

  try {
    return await requestLlmParsed(
      config,
      [
        { role: 'system', content: STYLE_EXTRACT_PROMPT },
        {
          role: 'user',
          content: `请分析以下文本样本的写作风格（仅前 ${CHUNK_SIZE} 字样本）：\n\n${sample}`,
        },
      ],
      (raw) => parseWritingStyleProfile(raw, { strict: true }),
    )
  } catch {
    // 文风提取失败时，返回默认风格，不阻塞流程
    return createDefaultStyleProfile()
  }
}

/**
 * 旧版兼容：同时提取内容与文风（一次调用）
 * @deprecated 请改用 extractWorldBookContent + extractWorldBookStyle
 */
export async function extractWorldBook(
  config: LlmConfig,
  sourceText: string,
): Promise<WorldBookExtractResult> {
  const [summary, style] = await Promise.all([
    extractWorldBookContent(config, sourceText),
    extractWorldBookStyle(config, sourceText),
  ])
  return { summary, style }
}

/** @deprecated */
export async function extractWorldBookSummary(
  apiKey: string,
  sourceText: string,
): Promise<WorldBookSummary> {
  const { getLlmConfig } = await import('./llm/storage')
  const result = await extractWorldBook(
    { ...getLlmConfig(), apiKey },
    sourceText,
  )
  return result.summary
}

export { formatWorldBookForPrompt }

// ---- 工具函数 ----

/** 将文本按最大字符数切分为多段 */
function splitIntoChunks(text: string, maxChars: number): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = start + maxChars
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks
}
