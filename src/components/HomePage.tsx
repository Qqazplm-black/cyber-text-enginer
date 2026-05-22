import { useState } from 'react'
import { createDefaultStyleProfile, type WritingStyleProfile } from '../types/style'
import type { WorldBookSummary } from '../types/worldbook'
import type { GenesisPersonality } from '../types/genesis'
import StyleProfileEditor from './StyleProfileEditor'
import WorldBookPanel from './WorldBookPanel'
import PersonalityPicker from './PersonalityPicker'
import GenesisChat from './GenesisChat'
import ApiSettings from './ApiSettings'
import { getLlmConfig } from '../services/llm/storage'
import type { LlmConfig } from '../services/llm/types'
import './HomePage.css'

type Props = {
  onContinue: (gameId: string) => void
  onPlayShared: (hash: string) => void
  onRefresh?: () => void
}

export default function HomePage({
  onPlayShared,
}: Props) {
  // ── 游戏是否已启动（进入 GenesisChat 阶段） ──
  const [gameStarted, setGameStarted] = useState(false)

  // ── 独立弹窗状态 ──
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false)
  const [isWorldBookModalOpen, setIsWorldBookModalOpen] = useState(false)
  const [isApiOpen, setIsApiOpen] = useState(false)

  // ── 胶囊配置数据（从浮层中收集，持久保留） ──
  const [styleProfile, setStyleProfile] = useState<WritingStyleProfile | null>(null)
  const [worldBookSummary, setWorldBookSummary] = useState<WorldBookSummary | null>(null)
  const [worldBookReady, setWorldBookReady] = useState(false)
  const [personality, setPersonality] = useState<GenesisPersonality | null>(null)
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(getLlmConfig)

  // ── 核心发车函数：点击"开始创世"后直接进入聊天界面 ──
  function handleStartGenesis() {
    setGameStarted(true)
  }

  // ── 如果游戏已启动，直接渲染 GenesisChat（带上配置参数） ──
  if (gameStarted) {
    return (
      <GenesisChat
        initialStyle={styleProfile}
        initialWorldBook={worldBookSummary}
        initialPersonality={personality}
        onNavigateHome={() => setGameStarted(false)}
      />
    )
  }

  return (
    <div className="home-page">
      {/* ── 右上角 API 设置按钮 ── */}
      <button
        type="button"
        className="home-page__api-btn"
        onClick={() => setIsApiOpen(true)}
        aria-label="API 设置"
      >
        ⚙️ API
      </button>

      {/* ── 中央创世区 ── */}
      <div className="home-page__canvas">
        <h1 className="home-page__title">你想创造什么？</h1>

        {/* ── Pill Buttons ── */}
        <div className="home-page__pill-row">
          <button
            type="button"
            className="home-page__pill"
            onClick={() => setIsPersonaModalOpen(true)}
          >
            🎭 创作风格
          </button>
          <button
            type="button"
            className="home-page__pill"
            onClick={() => setIsWorldBookModalOpen(true)}
          >
            📚 世界书
          </button>
        </div>

        {/* ── 幽灵输入框 ── */}
        <div className="home-page__input-area">
          <input
            type="text"
            className="home-page__ghost-input"
            placeholder="用一句核心创意定义你的世界（例如：一个全网封锁下的极客网络迷宫）..."
          />
        </div>

        {/* ── 开始创世按钮 ── */}
        <button
          type="button"
          className="home-page__genesis-btn"
          onClick={handleStartGenesis}
        >
          开始创世
        </button>
      </div>

      {/* ── 创作风格弹窗 (Modal) ── */}
      {isPersonaModalOpen && (
        <div className="home-page__modal-overlay" onClick={() => setIsPersonaModalOpen(false)}>
          <div className="home-page__modal" onClick={(e) => e.stopPropagation()}>
            <div className="home-page__modal-header">
              <h2 className="home-page__modal-title">🎭 创作风格</h2>
              <button
                type="button"
                className="home-page__modal-close"
                onClick={() => setIsPersonaModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="home-page__modal-body">
              <p className="home-page__modal-hint">
                调整文字世界的叙事风格与文笔基调
              </p>
              {/* AI 人格选择 */}
              <div className="home-page__modal-section">
                <PersonalityPicker
                  value={personality}
                  onChange={setPersonality}
                  disabled={false}
                />
              </div>
              {/* 风格编辑器 */}
              <StyleProfileEditor
                profile={styleProfile ?? createDefaultStyleProfile()}
                onChange={setStyleProfile}
                disabled={false}
              />
            </div>
            <div className="home-page__modal-footer">
              <button
                type="button"
                className="home-page__modal-btn"
                onClick={() => setIsPersonaModalOpen(false)}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 世界书弹窗 (Modal) ── */}
      {isWorldBookModalOpen && (
        <div className="home-page__modal-overlay" onClick={() => setIsWorldBookModalOpen(false)}>
          <div className="home-page__modal home-page__modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="home-page__modal-header">
              <h2 className="home-page__modal-title">📚 世界书</h2>
              <button
                type="button"
                className="home-page__modal-close"
                onClick={() => setIsWorldBookModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="home-page__modal-body">
              <WorldBookPanel
                llmConfig={llmConfig}
                disabled={false}
                confirmed={worldBookSummary}
                confirmedStyle={styleProfile}
                onConfirm={(summary, style) => {
                  setWorldBookSummary(summary)
                  if (style) setStyleProfile(style)
                  // 不关闭弹窗，让用户通过底部"确认使用此世界书"按钮关闭
                }}
                onRequireApi={() => {
                  setIsApiOpen(true)
                }}
                onContentReady={(summary) => {
                  setWorldBookSummary(summary)
                  setWorldBookReady(true)
                }}
              />
            </div>
            <div className="home-page__modal-footer">
              <button
                type="button"
                className="home-page__modal-btn home-page__modal-btn--primary"
                disabled={!worldBookReady}
                onClick={() => {
                  if (worldBookReady) {
                    setIsWorldBookModalOpen(false)
                  }
                }}
              >
                {worldBookReady ? '确认使用此世界书' : '请先上传并确认世界书'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── API 设置弹窗 ── */}
      <ApiSettings
        open={isApiOpen}
        onClose={() => {
          setLlmConfig(getLlmConfig())
          setIsApiOpen(false)
        }}
      />
    </div>
  )
}
