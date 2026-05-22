import { useRef, useState } from 'react'
import {
  extractWorldBookContent,
  extractWorldBookStyle,
} from '../services/worldbook'
import {
  createDefaultStyleProfile,
  type WritingStyleProfile,
} from '../types/style'
import type { WorldBookPanelPhase, WorldBookSummary } from '../types/worldbook'
import type { LlmConfig } from '../services/llm/types'
import StyleProfileEditor from './StyleProfileEditor'
import './WorldBookPanel.css'

const EMPTY_SUMMARY: WorldBookSummary = {
  worldview: '',
  characters: '',
  factions: '',
  rules: '',
}

const SUMMARY_FIELDS: Array<{
  key: keyof WorldBookSummary
  label: string
}> = [
  { key: 'worldview', label: '世界观' },
  { key: 'characters', label: '人物' },
  { key: 'factions', label: '势力' },
  { key: 'rules', label: '规则' },
]

type Props = {
  llmConfig: LlmConfig
  disabled: boolean
  confirmed: WorldBookSummary | null
  confirmedStyle: WritingStyleProfile | null
  onConfirm: (
    summary: WorldBookSummary | null,
    style: WritingStyleProfile | null,
  ) => void
  onRequireApi: () => void
  /** 内容提取完成（进入 review 阶段）时触发，告知外部已有数据可用 */
  onContentReady?: (summary: WorldBookSummary) => void
}

export default function WorldBookPanel({
  llmConfig,
  disabled,
  confirmed,
  confirmedStyle,
  onConfirm,
  onRequireApi,
  onContentReady,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<WorldBookPanelPhase>(
    confirmed ? 'confirmed' : 'input',
  )
  const [pasteText, setPasteText] = useState('')
  const [summary, setSummary] = useState<WorldBookSummary>(
    confirmed ?? EMPTY_SUMMARY,
  )
  const [style, setStyle] = useState<WritingStyleProfile>(
    confirmedStyle ?? createDefaultStyleProfile(),
  )
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(!confirmed)

  // 两步独立进度
  const [contentProgress, setContentProgress] = useState<{
    done: number
    total: number
  } | null>(null)
  const [contentDone, setContentDone] = useState(false)
  const [styleDone, setStyleDone] = useState(false)
  const [styleFailed, setStyleFailed] = useState(false)
  const [styleSkipped, setStyleSkipped] = useState(false)

  async function runExtract(source: string) {
    const { validateLlmConfig } = await import('../services/llm/storage')
    if (validateLlmConfig(llmConfig)) {
      onRequireApi()
      return
    }
    if (!source.trim()) {
      setError('请先上传文件或粘贴世界书内容')
      return
    }

    setError(null)
    setPhase('extracting')
    setContentDone(false)
    setStyleDone(false)
    setStyleFailed(false)
    setStyleSkipped(false)
    setContentProgress(null)

    // 第一步：内容提取（处理全文）
    const contentPromise = extractWorldBookContent(llmConfig, source, (done, total) => {
      setContentProgress({ done, total })
    }).then((result) => {
      setSummary(result)
      setContentDone(true)
      return result
    })

    // 第二步：文风分析（只取样本，独立运行）
    // 改进：文风提取失败不会阻塞内容提取结果
    const stylePromise = extractWorldBookStyle(llmConfig, source)
      .then((result) => {
        setStyle(result)
        setStyleDone(true)
        // 检测是否为设定集风格（所有标签都是"设定集风格"）
        const isSettingDocStyle = Object.keys(result).every((key) => {
          const k = key as keyof typeof result
          return result[k].tags.length === 1 && result[k].tags[0] === '设定集风格'
        })
        if (isSettingDocStyle) {
          setStyleSkipped(true)
        }
        return result
      })
      .catch(() => {
        // 文风提取失败：标记失败，使用默认风格，不阻塞流程
        setStyle(createDefaultStyleProfile())
        setStyleFailed(true)
        setStyleDone(true)
      })

    try {
      // 等待内容提取完成（文风提取独立处理，失败也不影响）
      const summaryResult = await contentPromise
      // 等待文风提取完成（即使失败也已内部处理）
      await stylePromise
      setPhase('review')
      setExpanded(true)
      // 通知外部内容已提取完成
      onContentReady?.(summaryResult)
    } catch (err) {
      // 只有内容提取失败才会到这里
      setPhase('input')
      setError(
        err instanceof Error ? err.message : '世界书解析失败，请重试',
      )
    } finally {
      setContentProgress(null)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('仅支持 .txt 文件')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setPasteText(text)
      setError(null)
      void runExtract(text)
    }
    reader.onerror = () => setError('文件读取失败')
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  function handleConfirm() {
    const valid = SUMMARY_FIELDS.every((f) => summary[f.key].trim())
    if (!valid) {
      setError('请填写完整的世界书摘要后再确认')
      return
    }
    setError(null)
    setPhase('confirmed')
    setExpanded(false)
    onConfirm(summary, style)
  }

  function handleClear() {
    setPasteText('')
    setSummary(EMPTY_SUMMARY)
    setStyle(createDefaultStyleProfile())
    setPhase('input')
    setExpanded(true)
    setError(null)
    setContentDone(false)
    setStyleDone(false)
    setContentProgress(null)
    onConfirm(null, null)
  }

  function handleEdit() {
    setPhase('review')
    setExpanded(true)
  }

  const isBusy = phase === 'extracting'
  const locked = disabled || isBusy

  if (phase === 'confirmed' && !expanded) {
    return (
      <div className="worldbook worldbook--collapsed">
        <div className="worldbook__bar">
          <span className="worldbook__badge">世界书 + 文风已载入</span>
          <div className="worldbook__bar-actions">
            <button
              type="button"
              className="worldbook__link"
              onClick={() => setExpanded(true)}
              disabled={locked}
            >
              查看
            </button>
            <button
              type="button"
              className="worldbook__link"
              onClick={handleEdit}
              disabled={locked}
            >
              编辑
            </button>
            <button
              type="button"
              className="worldbook__link worldbook__link--muted"
              onClick={handleClear}
              disabled={locked}
            >
              移除
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="worldbook" aria-label="上传世界书">
      <div className="worldbook__head">
        <h2 className="worldbook__title">上传世界书</h2>
        {phase === 'confirmed' && (
          <button
            type="button"
            className="worldbook__link"
            onClick={() => setExpanded(false)}
          >
            收起
          </button>
        )}
      </div>

      {phase === 'input' && (
        <>
          <div className="worldbook__upload-row">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="worldbook__file-input"
              onChange={handleFileChange}
              disabled={locked}
            />
            <button
              type="button"
              className="worldbook__upload-btn"
              onClick={() => fileRef.current?.click()}
              disabled={locked}
            >
              选择 .txt 文件
            </button>
            <span className="worldbook__hint">或在下框粘贴原文</span>
          </div>
          <textarea
            className="worldbook__paste"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="粘贴世界书原文：设定集、角色志、规则说明等……"
            rows={3}
            disabled={locked}
          />
          <button
            type="button"
            className="worldbook__action"
            onClick={() => void runExtract(pasteText)}
            disabled={locked || !pasteText.trim()}
          >
            {isBusy ? '正在提取…' : '生成摘要与文风'}
          </button>
        </>
      )}

      {isBusy && (
        <div className="worldbook__extract-progress">
          {/* 第一步：内容提取 */}
          <div className="worldbook__step">
            <div className="worldbook__step-header">
              <span
                className={`worldbook__step-icon ${
                  contentDone
                    ? 'worldbook__step-icon--done'
                    : 'worldbook__step-icon--active'
                }`}
              >
                {contentDone ? '✓' : '⟳'}
              </span>
              <span className="worldbook__step-label">
                第一步：内容提取（处理全文）
              </span>
              {contentProgress && (
                <span className="worldbook__step-progress">
                  {contentProgress.done}/{contentProgress.total} 段
                </span>
              )}
            </div>
            {contentProgress && contentProgress.total > 1 && (
              <div className="worldbook__progress-bar">
                <div
                  className="worldbook__progress-fill"
                  style={{
                    width: `${(contentProgress.done / contentProgress.total) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* 第二步：文风分析 */}
          <div className="worldbook__step">
            <div className="worldbook__step-header">
              <span
                className={`worldbook__step-icon ${
                  styleDone
                    ? 'worldbook__step-icon--done'
                    : 'worldbook__step-icon--active'
                }`}
              >
                {styleDone ? '✓' : '⟳'}
              </span>
              <span className="worldbook__step-label">
                第二步：文风分析（只取样本）
              </span>
            </div>
          </div>
        </div>
      )}

      {(phase === 'review' || (phase === 'confirmed' && expanded)) && (
        <div className="worldbook__review">
          <p className="worldbook__review-hint">
            请确认世界书摘要与文风参数，确认后将作为底层参考。
          </p>

          {/* 文风提取失败或自动跳过时的提示 */}
          {styleFailed && (
            <div className="worldbook__style-warning" role="alert">
              <p className="worldbook__style-warning-text">
                ⚠️ 文风分析失败，已自动跳过。您可以直接使用默认文风参数，或手动编辑下方的文风配置。
              </p>
            </div>
          )}
          {styleSkipped && (
            <div className="worldbook__style-warning" role="alert">
              <p className="worldbook__style-warning-text">
                📋 检测到设定集/规则文档风格，已自动标注"设定集风格"并跳过文风标签提取。
              </p>
            </div>
          )}

          {SUMMARY_FIELDS.map(({ key, label }) => (
            <label key={key} className="worldbook__field">
              <span>{label}</span>
              <textarea
                value={summary[key]}
                onChange={(e) =>
                  setSummary((prev) => ({ ...prev, [key]: e.target.value }))
                }
                rows={2}
                disabled={locked}
              />
            </label>
          ))}
          <StyleProfileEditor
            profile={style}
            onChange={setStyle}
            disabled={locked}
          />
          <div className="worldbook__review-actions">
            <button
              type="button"
              className="worldbook__action worldbook__action--primary"
              onClick={handleConfirm}
              disabled={locked}
            >
              确认世界书
            </button>
            <button
              type="button"
              className="worldbook__action worldbook__action--ghost"
              onClick={() => {
                setPhase('input')
                setError(null)
              }}
              disabled={locked}
            >
              重新上传
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="worldbook__error-wrap" role="alert">
          <p className="worldbook__error">{error}</p>
          {(pasteText.trim() || phase === 'input') && !isBusy && (
            <button
              type="button"
              className="worldbook__retry"
              onClick={() => void runExtract(pasteText)}
            >
              重试
            </button>
          )}
        </div>
      )}
    </section>
  )
}
