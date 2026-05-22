export type ApiProvider = 'deepseek' | 'openai' | 'ollama'

export type LlmConfig = {
  provider: ApiProvider
  apiKey: string
  ollamaBaseUrl: string
  ollamaModel: string
}

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const PROVIDER_LABELS: Record<ApiProvider, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  ollama: '本地 Ollama',
}

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434/v1'
export const DEFAULT_OLLAMA_MODEL = 'llama3.2'
