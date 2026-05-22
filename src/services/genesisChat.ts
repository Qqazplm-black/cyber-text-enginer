import { buildGenesisSystemPrompt } from './genesisPrompt'
import { parseGenesisResponse } from './genesisProtocol'
import { requestLlmParsed } from './llm/client'
import type { LlmConfig } from './llm/types'
import type { GenesisPersonality, GenesisResponse } from '../types/genesis'
import type { WorldBookSummary } from '../types/worldbook'

export async function chatGenesisTurn(
  config: LlmConfig,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  worldBook?: WorldBookSummary | null,
  personality?: GenesisPersonality | null,
): Promise<GenesisResponse> {
  const messages = [
    { role: 'system' as const, content: buildGenesisSystemPrompt(worldBook, personality) },
    ...history,
  ]

  return requestLlmParsed(config, messages, parseGenesisResponse)
}
