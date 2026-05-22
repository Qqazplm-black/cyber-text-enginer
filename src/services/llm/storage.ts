import {
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
  type ApiProvider,
  type LlmConfig,
} from './types'

const STORAGE_KEY = 'genesis_llm_config'

export function getLlmConfig(): LlmConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LlmConfig>
      return {
        provider: parsed.provider ?? 'deepseek',
        apiKey: parsed.apiKey ?? '',
        ollamaBaseUrl: parsed.ollamaBaseUrl ?? DEFAULT_OLLAMA_URL,
        ollamaModel: parsed.ollamaModel ?? DEFAULT_OLLAMA_MODEL,
      }
    }
  } catch {
    /* ignore */
  }
  const legacy = localStorage.getItem('genesis_deepseek_api_key')
  return {
    provider: 'deepseek',
    apiKey: legacy ?? '',
    ollamaBaseUrl: DEFAULT_OLLAMA_URL,
    ollamaModel: DEFAULT_OLLAMA_MODEL,
  }
}

export function setLlmConfig(config: LlmConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  if (config.provider === 'deepseek' && config.apiKey) {
    localStorage.setItem('genesis_deepseek_api_key', config.apiKey)
  }
}

export function validateLlmConfig(config: LlmConfig): string | null {
  if (config.provider === 'ollama') {
    if (!config.ollamaBaseUrl.trim()) return '请填写 Ollama 地址'
    return null
  }
  if (!config.apiKey.trim()) return '请填写 API Key'
  return null
}

export function getProviderEndpoint(
  provider: ApiProvider,
  ollamaBaseUrl: string,
): string {
  switch (provider) {
    case 'deepseek':
      return 'https://api.deepseek.com/chat/completions'
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions'
    case 'ollama':
      return `${ollamaBaseUrl.replace(/\/$/, '')}/chat/completions`
  }
}

export function getProviderModel(
  provider: ApiProvider,
  ollamaModel: string,
): string {
  switch (provider) {
    case 'deepseek':
      return 'deepseek-chat'
    case 'openai':
      return 'gpt-4o-mini'
    case 'ollama':
      return ollamaModel || DEFAULT_OLLAMA_MODEL
  }
}
