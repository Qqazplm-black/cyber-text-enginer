/** @deprecated 请使用 llm 模块；保留兼容导出 */
import { requestLlmJson } from './llm/client'
import { getLlmConfig, setLlmConfig } from './llm/storage'
import type { ChatMessage } from './llm/types'

export const API_KEY_STORAGE_KEY = 'genesis_deepseek_api_key'

export type ApiChatMessage = ChatMessage

export function getStoredApiKey(): string {
  return getLlmConfig().apiKey
}

export function setStoredApiKey(key: string): void {
  const config = getLlmConfig()
  setLlmConfig({ ...config, apiKey: key })
}

export async function requestDeepSeekJson(
  apiKey: string,
  messages: ChatMessage[],
  temperature = 0.7,
): Promise<string> {
  const config = getLlmConfig()
  return requestLlmJson({ ...config, apiKey }, messages, temperature)
}
