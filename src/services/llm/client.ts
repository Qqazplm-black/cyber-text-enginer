import { withRetry } from '../retry'
import {
  getProviderEndpoint,
  getProviderModel,
  validateLlmConfig,
} from './storage'
import type { ChatMessage, LlmConfig } from './types'

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

export async function requestLlmJson(
  config: LlmConfig,
  messages: ChatMessage[],
  temperature = 0.7,
): Promise<string> {
  const validation = validateLlmConfig(config)
  if (validation) throw new Error(validation)

  return withRetry(
    () => callChatApi(config, messages, temperature),
    { maxAttempts: 3 },
  )
}

/** 请求 LLM 并解析 JSON；网络或格式错误时自动重试，最多 3 次 */
export async function requestLlmParsed<T>(
  config: LlmConfig,
  messages: ChatMessage[],
  parse: (raw: string) => T,
  temperature = 0.7,
): Promise<T> {
  const validation = validateLlmConfig(config)
  if (validation) throw new Error(validation)

  return withRetry(
    async () => {
      const raw = await callChatApi(config, messages, temperature)
      return parse(raw)
    },
    { maxAttempts: 3 },
  )
}

async function callChatApi(
  config: LlmConfig,
  messages: ChatMessage[],
  temperature: number,
): Promise<string> {
  const url = getProviderEndpoint(config.provider, config.ollamaBaseUrl)
  const model = getProviderModel(config.provider, config.ollamaModel)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.provider !== 'ollama' && config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
  }

  if (config.provider !== 'ollama') {
    body.response_format = { type: 'json_object' }
  } else {
    const last = messages[messages.length - 1]
    if (last?.role === 'user') {
      last.content += '\n\n请只回复一个合法的 JSON 对象，不要 Markdown 代码块。'
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = (await response.json()) as ChatCompletionResponse

  if (!response.ok) {
    throw new Error(data.error?.message ?? `请求失败（${response.status}）`)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 未返回有效内容')
  return content
}
