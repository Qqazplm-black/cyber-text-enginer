import { useState } from 'react'
import { getLlmConfig, setLlmConfig } from '../services/llm/storage'
import {
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
  PROVIDER_LABELS,
  type ApiProvider,
  type LlmConfig,
} from '../services/llm/types'
import './ApiSettings.css'

type Props = {
  open: boolean
  onClose: () => void
}

export default function ApiSettings({ open, onClose }: Props) {
  const [config, setConfig] = useState<LlmConfig>(getLlmConfig)

  if (!open) return null

  function save() {
    setLlmConfig(config)
    onClose()
  }

  return (
    <div className="api-settings-overlay" role="dialog" aria-modal="true">
      <div className="api-settings">
        <header className="api-settings__head">
          <h2>API 设置</h2>
          <button type="button" className="api-settings__close" onClick={onClose}>
            ×
          </button>
        </header>

        <label className="api-settings__field">
          <span>服务商</span>
          <select
            value={config.provider}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                provider: e.target.value as ApiProvider,
              }))
            }
          >
            {(Object.keys(PROVIDER_LABELS) as ApiProvider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </label>

        {config.provider === 'ollama' ? (
          <>
            <label className="api-settings__field">
              <span>Ollama 地址</span>
              <input
                type="url"
                value={config.ollamaBaseUrl}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, ollamaBaseUrl: e.target.value }))
                }
                placeholder={DEFAULT_OLLAMA_URL}
              />
            </label>
            <label className="api-settings__field">
              <span>模型名称</span>
              <input
                type="text"
                value={config.ollamaModel}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, ollamaModel: e.target.value }))
                }
                placeholder={DEFAULT_OLLAMA_MODEL}
              />
            </label>
          </>
        ) : (
          <label className="api-settings__field">
            <span>API Key</span>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) =>
                setConfig((c) => ({ ...c, apiKey: e.target.value }))
              }
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>
        )}

        <p className="api-settings__hint">
          {config.provider === 'ollama'
            ? '请确保 Ollama 已启动并开启 OpenAI 兼容接口。'
            : '密钥仅保存在本地浏览器，不会上传至第三方服务器。'}
        </p>

        <button type="button" className="api-settings__save" onClick={save}>
          保存
        </button>
      </div>
    </div>
  )
}
