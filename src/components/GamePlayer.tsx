import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyChoiceEffects,
  applyStatDeltas,
  clampStats,
  createInitialStats,
  isGameOver,
} from '../engine/gameRuntime'
import { useTypewriter } from '../hooks/useTypewriter'
import { generateOpeningScene, playStoryTurn, updateNpcWeights } from '../services/play'
import { getLlmConfig, validateLlmConfig } from '../services/llm/storage'
import type { LlmConfig } from '../services/llm/types'
import {
  deleteGameSave,
  loadGameSave,
  saveGameProgress,
} from '../storage/save'
import type {
  CompiledGame,
  EndingType,
  GameRuntimeStats,
  PlayChoiceOption,
  StoryBeat,
} from '../types/genesis'
import type { NpcSoulCardMap } from '../types/npcSoulCard'
import type { WritingStyleProfile } from '../types/style'
import type { WorldBookSummary } from '../types/worldbook'
import { WORD_COUNT_LABELS, type WordCountMode } from '../services/playPrompt'
import ApiSettings from './ApiSettings'
import EndingScreen from './EndingScreen'
import './GamePlayer.css'


type Props = {
  game: CompiledGame
  gameId: string
  worldBook?: WorldBookSummary | null
  style?: WritingStyleProfile | null
  onBackToGenesis: () => void
}

const CHOICE_KEYS = ['A', 'B', 'C'] as const

/** 快捷指令定义 */
const QUICK_COMMANDS = [
  { label: '旁白', prefix: '旁白：', instant: false },
  { label: 'OOC', prefix: 'OOC：', instant: false },
  { label: '内心', prefix: '内心：', instant: false },
  { label: '摄像机视角', prefix: '摄像机视角：', instant: false },
  { label: '描写画面', prefix: '描写当前画面', instant: true },
  { label: '详细描写', prefix: '详细描写', instant: true },
  { label: '继续', prefix: '继续', instant: true },
  { label: '推进剧情', prefix: '推进剧情到下一个场景', instant: true },
  { label: '时间流逝', prefix: '时间流逝——', instant: true },
  { label: '加快节奏', prefix: '加快节奏', instant: true },
]

function bootstrapChoices(game: CompiledGame): PlayChoiceOption[] {
  const scene = game.scenes[game.startScene]
  return (scene?.choices ?? []).slice(0, 3).map((c) => ({
    label: c.label,
    effects: c.effects,
  }))
}

export default function GamePlayer({
  game,
  gameId,
  worldBook,
  style,
  onBackToGenesis,
}: Props) {
  const saved = loadGameSave(gameId)
  const effectiveWorldBook = worldBook ?? saved?.worldBook ?? null
  const effectiveStyle = style ?? saved?.style ?? null
  const startScene = game.scenes[game.startScene]

  const [llmConfig, setLlmConfig] = useState<LlmConfig>(getLlmConfig)
  const [apiOpen, setApiOpen] = useState(false)
  const [stats, setStats] = useState<GameRuntimeStats>(
    () => saved?.stats ?? createInitialStats(game),
  )
  const [narrative, setNarrative] = useState(
    () => saved?.narrative ?? startScene?.text ?? game.intro,
  )
  const [choices, setChoices] = useState<PlayChoiceOption[]>(
    () => saved?.choices ?? bootstrapChoices(game),
  )
  const [history, setHistory] = useState<StoryBeat[]>(() => saved?.history ?? [])
  const [showIntro, setShowIntro] = useState(saved?.showIntro ?? true)
  const [ended, setEnded] = useState(saved?.ended ?? false)
  const [endingType, setEndingType] = useState<EndingType | null>(
    saved?.endingType ?? null,
  )
  const [endingMessage, setEndingMessage] = useState<string | null>(
    saved?.endingMessage ?? null,
  )
  const [loading, setLoading] = useState(false)
  const [generatingOpening, setGeneratingOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typewriterOn, setTypewriterOn] = useState(false)
  const [openingGenerated, setOpeningGenerated] = useState(
    () => saved?.openingGenerated ?? false,
  )
  const [openingNarrative, setOpeningNarrative] = useState(
    () => saved?.openingNarrative ?? '',
  )
  const [openingChoices, setOpeningChoices] = useState<PlayChoiceOption[]>(
    () => saved?.openingChoices ?? [],
  )
  const [saveHint, setSaveHint] = useState<string | null>(null)
  const [pendingChoiceIndex, setPendingChoiceIndex] = useState<number | null>(
    null,
  )
  const [wordCountMode, setWordCountMode] = useState<WordCountMode>(
    (saved?.wordCountMode as WordCountMode) ?? 'standard',
  )
  const [showWordCountPicker, setShowWordCountPicker] = useState(false)

  // NPC 灵魂卡状态（包含权重数据，每回合动态更新）
  const [npcSoulCards, setNpcSoulCards] = useState<NpcSoulCardMap | undefined>(
    () => saved?.npcSoulCards ?? game.npcSoulCards,
  )

  // 回合计数器（用于权重衰减判断）
  const turnCountRef = useRef(saved?.turnCount ?? 0)

  // 自由输入相关状态
  const [freeInput, setFreeInput] = useState('')
  const [showQuickCommands, setShowQuickCommands] = useState(false)
  const [inputMode, setInputMode] = useState<'both' | 'choices-only' | 'free-only'>('both')
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null)
  const narrativeRef = useRef<HTMLDivElement>(null)
  const newContentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const freeAreaRef = useRef<HTMLDivElement>(null)
  const quickPanelRef = useRef<HTMLDivElement>(null)
  const quickToggleRef = useRef<HTMLButtonElement>(null)


  // 开场白打字机效果：开场白已生成且showIntro为false时启用
  const displayedNarrative = useTypewriter(
    narrative,
    typewriterOn && !showIntro && !ended,
    3,
    20,
  )
  const isTyping =
    typewriterOn &&
    !showIntro &&
    !ended &&
    displayedNarrative.length < narrative.length

  // 新内容出现时，滚动到新内容块的开头位置，让用户从第一个字开始阅读
  useEffect(() => {
    if (newContentRef.current && narrativeRef.current) {
      narrativeRef.current.scrollTop =
        newContentRef.current.offsetTop - narrativeRef.current.offsetTop
    }
  }, [narrative])


  const persistSave = useCallback(() => {
    saveGameProgress({
      gameId,
      title: game.title,
      savedAt: Date.now(),
      stats,
      narrative,
      choices,
      history,
      showIntro,
      ended,
      endingType,
      endingMessage,
      worldBook: effectiveWorldBook,
      style: effectiveStyle,
      wordCountMode,
      openingGenerated,
      openingNarrative,
      openingChoices,
      npcSoulCards,
      turnCount: turnCountRef.current,
    })
  }, [
    gameId,
    game.title,
    stats,
    narrative,
    choices,
    history,
    showIntro,
    ended,
    endingType,
    endingMessage,
    effectiveWorldBook,
    effectiveStyle,
    wordCountMode,
    openingGenerated,
    openingNarrative,
    openingChoices,
    npcSoulCards,
  ])

  useEffect(() => {
    if (!showIntro && !ended) {
      persistSave()
    }
  }, [persistSave, showIntro, ended])

  function handleSave() {
    persistSave()
    setSaveHint('进度已保存到本地')
    setTimeout(() => setSaveHint(null), 2000)
  }

  /**
   * 从玩家输入文本中提取可能涉及的NPC名称
   * 简单匹配：检查输入文本中是否包含NPC的名字
   */
  function detectInteractedNpcs(inputText: string): string[] {
    if (!npcSoulCards) return []
    const names: string[] = []
    for (const card of Object.values(npcSoulCards)) {
      if (inputText.includes(card.name)) {
        names.push(card.name)
      }
    }
    return names
  }

  /** 通用剧情推进函数：接收玩家输入文本 */
  async function submitPlayerInput(inputText: string) {
    if (!inputText.trim() || loading || ended) return

    const validation = validateLlmConfig(llmConfig)
    if (validation) {
      setError(validation)
      setApiOpen(true)
      return
    }

    setError(null)
    setLoading(true)
    setTypewriterOn(false)

    try {
      const turn = await playStoryTurn(
        llmConfig,
        game,
        stats,
        history,
        inputText.trim(),
        effectiveWorldBook,
        effectiveStyle,
        wordCountMode,
      )

      const nextStats = clampStats(
        applyStatDeltas(stats, game, turn.statDeltas),
        game,
      )

      const beat: StoryBeat = {
        playerChoice: inputText.trim(),
        narrative: turn.narrative,
      }
      setHistory((prev) => [...prev, beat])
      setNarrative(turn.narrative)

      setStats(nextStats)
      setTypewriterOn(true)

      // 每回合结束后更新NPC权重
      if (npcSoulCards) {
        turnCountRef.current += 1
        const interactedNpcs = detectInteractedNpcs(inputText.trim())
        const updatedCards = updateNpcWeights(
          npcSoulCards,
          interactedNpcs,
          turnCountRef.current,
        )
        setNpcSoulCards(updatedCards)
      }

      if (turn.ended || isGameOver(nextStats, game)) {
        const type =
          turn.endingType ??
          (isGameOver(nextStats, game) ? 'defeat' : 'neutral')
        setEnded(true)
        setEndingType(type)
        setChoices([])
        setEndingMessage(
          turn.endingMessage ??
            (isGameOver(nextStats, game)
              ? '你的状态已跌至极限，故事在此画上句点。'
              : '故事已迎来结局。'),
        )
      } else {
        setChoices(turn.choices)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '剧情生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function choose(choiceIndex: number) {
    const choice = choices[choiceIndex]
    if (!choice || loading || ended) return

    const validation = validateLlmConfig(llmConfig)
    if (validation) {
      setError(validation)
      setApiOpen(true)
      return
    }

    setError(null)
    setPendingChoiceIndex(choiceIndex)
    setLoading(true)
    setTypewriterOn(false)

    const statsAfterChoice = clampStats(
      applyChoiceEffects(stats, game, choice.effects),
      game,
    )

    try {
      const turn = await playStoryTurn(
        llmConfig,
        game,
        statsAfterChoice,
        history,
        choice.label,
        effectiveWorldBook,
        effectiveStyle,
        wordCountMode,
      )

      const nextStats = clampStats(
        applyStatDeltas(statsAfterChoice, game, turn.statDeltas),
        game,
      )

      const beat: StoryBeat = {
        playerChoice: choice.label,
        narrative: turn.narrative,
      }
      setHistory((prev) => [...prev, beat])
      setNarrative(turn.narrative)

      setStats(nextStats)
      setTypewriterOn(true)

      // 每回合结束后更新NPC权重
      if (npcSoulCards) {
        turnCountRef.current += 1
        const interactedNpcs = detectInteractedNpcs(choice.label)
        const updatedCards = updateNpcWeights(
          npcSoulCards,
          interactedNpcs,
          turnCountRef.current,
        )
        setNpcSoulCards(updatedCards)
      }

      if (turn.ended || isGameOver(nextStats, game)) {
        const type =
          turn.endingType ??
          (isGameOver(nextStats, game) ? 'defeat' : 'neutral')
        setEnded(true)
        setEndingType(type)
        setChoices([])
        setEndingMessage(
          turn.endingMessage ??
            (isGameOver(nextStats, game)
              ? '你的状态已跌至极限，故事在此画上句点。'
              : '故事已迎来结局。'),
        )
      } else {
        setChoices(turn.choices)
      }
      setPendingChoiceIndex(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '剧情生成失败，请重试')
      setStats(statsAfterChoice)
    } finally {
      setLoading(false)
    }
  }

  /** 进入故事：调用AI生成开场白 */
  async function enterStory() {
    const validation = validateLlmConfig(llmConfig)
    if (validation) {
      setError(validation)
      setApiOpen(true)
      return
    }

    setError(null)
    setShowIntro(false)
    setGeneratingOpening(true)
    setTypewriterOn(false)

    try {
      const opening = await generateOpeningScene(
        llmConfig,
        game,
        effectiveWorldBook,
        effectiveStyle,
      )

      setOpeningNarrative(opening.narrative)
      setOpeningChoices(opening.choices)
      setOpeningGenerated(true)
      setNarrative(opening.narrative)
      setChoices(opening.choices)
      setHistory([{ narrative: opening.narrative }])
      setTypewriterOn(true)
    } catch (err) {
      // 开场白生成失败时，回退到静态intro
      setError(err instanceof Error ? err.message : '开场白生成失败，使用默认开场')
      setNarrative(startScene?.text ?? game.intro)
      setChoices(bootstrapChoices(game))
      setHistory([{ narrative: game.intro }])
      setTypewriterOn(true)
    } finally {
      setGeneratingOpening(false)
    }
  }

  /** 点击快捷指令按钮 */
  function handleQuickCommand(cmd: typeof QUICK_COMMANDS[number]) {
    if (cmd.instant) {
      // 自动发送型：直接发送，面板收起
      setShowQuickCommands(false)
      void submitPlayerInput(cmd.prefix)
    } else {
      // 自动填入型：填入输入框，光标定位末尾，面板保持展开
      setFreeInput(cmd.prefix)
      // 使用 setTimeout 确保在 React 状态更新后聚焦并定位光标
      setTimeout(() => {
        const input = inputRef.current
        if (input) {
          input.focus()
          input.setSelectionRange(cmd.prefix.length, cmd.prefix.length)
        }
      }, 0)
    }
  }

  /** 点击面板外部区域关闭 */
  useEffect(() => {
    if (!showQuickCommands) return
    function handleClickOutside(e: MouseEvent) {
      if (
        quickPanelRef.current &&
        !quickPanelRef.current.contains(e.target as Node) &&
        quickToggleRef.current &&
        !quickToggleRef.current.contains(e.target as Node)
      ) {
        setShowQuickCommands(false)
      }
    }
    // 使用 click 事件而非 mousedown，避免与切换按钮的 click 处理冲突
    // 延迟添加以避免触发当前点击事件
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showQuickCommands])


  /** 选择选项：先播放动画再提交 */
  function handleChooseWithAnimation(index: number) {
    if (loading || isTyping || generatingOpening || ended) return
    setSelectedChoiceIndex(index)
    setInputMode('choices-only')
    // 等待动画完成后提交
    setTimeout(() => {
      void choose(index)
    }, 400)
  }

  /** 提交自由输入：先播放动画再提交 */
  function handleFreeSubmitWithAnimation(e: React.FormEvent) {
    e.preventDefault()
    if (!freeInput.trim() || loading || isTyping || generatingOpening || ended) return
    setInputMode('free-only')
    const text = freeInput.trim()
    setFreeInput('')
    // 等待动画完成后提交
    setTimeout(() => {
      submitPlayerInput(text)
    }, 400)
  }

  /** AI新回复后重置输入模式 */
  useEffect(() => {
    if (!loading && !ended && !showIntro) {
      setInputMode('both')
      setSelectedChoiceIndex(null)
    }
  }, [loading, ended, showIntro])

  return (
    <div className="game-player">
      <header className="game-player__header">
        <div className="game-player__header-left">
          <h1 className="game-player__title">{game.title}</h1>
        </div>
        <div className="game-player__header-actions">
          <button
            type="button"
            className="game-player__icon-btn"
            onClick={() => setShowWordCountPicker((v) => !v)}
            title="字数偏好"
            disabled={loading || showIntro}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h12M2 8h12M2 12h8" />
            </svg>
          </button>
          <button
            type="button"
            className="game-player__icon-btn"
            onClick={handleSave}
            disabled={loading || showIntro}
            title="存档"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h7.5L14 5.5V13a1 1 0 0 1-1 1z" />
              <path d="M5 14V9h6v5" />
            </svg>
          </button>
          <button
            type="button"
            className="game-player__icon-btn"
            onClick={() => setTypewriterOn((v) => !v)}
            title={typewriterOn ? '关闭打字机效果' : '开启打字机效果'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {typewriterOn ? (
                <>
                  <path d="M2 4l4 4-4 4" />
                  <path d="M8 12h6" />
                </>
              ) : (
                <>
                  <path d="M2 4l4 4-4 4" />
                  <path d="M8 4h6" />
                  <path d="M8 8h4" />
                  <path d="M8 12h2" />
                </>
              )}
            </svg>
          </button>
          <button
            type="button"
            className="game-player__icon-btn"
            onClick={() => setApiOpen(true)}
            title="API 设置"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="2.5" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
            </svg>
          </button>
          <button
            type="button"
            className="game-player__icon-btn game-player__icon-btn--back"
            onClick={onBackToGenesis}
            disabled={loading}
            title="返回创世"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2L4 8l6 6" />
            </svg>
          </button>
        </div>
      </header>

      {saveHint && <p className="game-player__save-hint">{saveHint}</p>}

      {/* Word count picker dropdown */}
      {showWordCountPicker && !showIntro && !ended && (
        <div className="game-player__wordcount-picker">
          <span className="game-player__wordcount-label">字数偏好</span>
          <div className="game-player__wordcount-options">
            {(Object.entries(WORD_COUNT_LABELS) as [WordCountMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={`game-player__wordcount-option${wordCountMode === mode ? ' game-player__wordcount-option--active' : ''}`}
                onClick={() => {
                  setWordCountMode(mode)
                  setShowWordCountPicker(false)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="game-player__main">
        <section className="game-player__narrative" ref={narrativeRef}>
          {showIntro ? (
            <>
              <p className="game-player__intro-label">开场</p>
              <p className="game-player__text">{game.intro}</p>
            </>
          ) : ended && endingType ? (
            <EndingScreen
              type={endingType}
              message={endingMessage ?? ''}
              narrative={narrative}
              onBack={() => {
                deleteGameSave(gameId)
                onBackToGenesis()
              }}
            />
          ) : (
            <>
              {/* 开场白生成中的加载状态 */}
              {generatingOpening && (
                <div className="game-player__loading-wrap">
                  <span className="game-player__loading-dot" />
                  <span className="game-player__loading-dot" />
                  <span className="game-player__loading-dot" />
                  <span className="game-player__loading-text">世界正在苏醒…</span>
                </div>
              )}
              {/* 常规剧情加载状态 */}
              {loading && !generatingOpening && (
                <div className="game-player__loading-wrap">
                  <span className="game-player__loading-dot" />
                  <span className="game-player__loading-dot" />
                  <span className="game-player__loading-dot" />
                  <span className="game-player__loading-text">剧情推演中…</span>
                </div>
              )}
              {/* 新内容锚点：AI输出新剧情时滚动到此位置 */}
              <div ref={newContentRef} />
              <p className="game-player__text">
                {displayedNarrative}
                {isTyping && <span className="game-player__cursor">▌</span>}
              </p>

            </>
          )}
          {error && (
            <div className="game-player__error-wrap" role="alert">
              <p className="game-player__error">{error}</p>
              {pendingChoiceIndex !== null && !loading && (
                <button
                  type="button"
                  className="game-player__retry"
                  onClick={() => void choose(pendingChoiceIndex)}
                >
                  重试
                </button>
              )}
            </div>
          )}
        </section>

        {!ended && (
          <div className="game-player__input-container">
            {/* 选项区域 - 上层 */}
            <div
              ref={choicesRef}
              className={`game-player__choices ${
                inputMode === 'free-only' ? 'game-player__choices--hidden' : ''
              } ${
                inputMode === 'choices-only' ? 'game-player__choices--expanded' : ''
              }`}
            >
              {showIntro ? (
                <button
                  type="button"
                  className="game-player__choice game-player__choice--solo"
                  onClick={() => void enterStory()}
                  disabled={generatingOpening}
                >
                  <span className="game-player__choice-key">A</span>
                  <span className="game-player__choice-label">
                    {generatingOpening ? '世界苏醒中…' : '进入故事'}
                  </span>
                </button>
              ) : (
                choices.map((choice, index) => (
                  <button
                    key={`${index}-${choice.label}`}
                    type="button"
                    className={`game-player__choice ${
                      selectedChoiceIndex === index ? 'game-player__choice--selected' : ''
                    }`}
                    onClick={() => handleChooseWithAnimation(index)}
                    disabled={loading || isTyping || generatingOpening || inputMode === 'choices-only'}
                  >
                    <span className="game-player__choice-key">
                      {CHOICE_KEYS[index]}
                    </span>
                    <span className="game-player__choice-label">
                      {choice.label}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* 自由输入区域 - 下层 */}
            <div
              ref={freeAreaRef}
              className={`game-player__free-input-area ${
                inputMode === 'choices-only' ? 'game-player__free-input-area--hidden' : ''
              } ${
                inputMode === 'free-only' ? 'game-player__free-input-area--expanded' : ''
              }`}
            >
              <form className="game-player__free-form" onSubmit={handleFreeSubmitWithAnimation}>
                <button
                  ref={quickToggleRef}
                  type="button"
                  className={`game-player__quick-toggle${showQuickCommands ? ' game-player__quick-toggle--active' : ''}`}
                  onClick={() => setShowQuickCommands((v) => !v)}
                  disabled={loading || isTyping || generatingOpening}
                  title="快捷指令"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h12M2 8h12M2 13h12" />
                    <path d="M6 3v10M10 3v10" />
                  </svg>
                </button>
                <div className="game-player__free-input-wrap">
                  <input
                    ref={inputRef}
                    type="text"
                    className="game-player__free-input"
                    placeholder="输入你的行动或对话…"
                    value={freeInput}
                    onChange={(e) => setFreeInput(e.target.value)}
                    disabled={loading || isTyping || generatingOpening || inputMode === 'free-only'}
                  />
                </div>
                <button
                  type="submit"
                  className="game-player__free-submit"
                  disabled={loading || isTyping || !freeInput.trim() || generatingOpening || inputMode === 'free-only'}
                  title="发送"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 8l14-6-6 14-3-5-5-3z" />
                  </svg>
                </button>
              </form>

              {/* 快捷指令面板 - 从图标上方展开，紧贴左侧 */}
              {showQuickCommands && (
                <div className="game-player__quick-panel" ref={quickPanelRef}>
                  <div className="game-player__quick-panel-body">
                    <div className="game-player__quick-panel-section">
                      <span className="game-player__quick-panel-section-title">补充内容</span>
                      <div className="game-player__quick-panel-grid">
                        {QUICK_COMMANDS.filter(c => !c.instant).map((cmd) => (
                          <button
                            key={cmd.label}
                            type="button"
                            className="game-player__quick-cmd"
                            onClick={() => handleQuickCommand(cmd)}
                          >
                            {cmd.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="game-player__quick-panel-section">
                      <span className="game-player__quick-panel-section-title">直接发送</span>
                      <div className="game-player__quick-panel-grid">
                        {QUICK_COMMANDS.filter(c => c.instant).map((cmd) => (
                          <button
                            key={cmd.label}
                            type="button"
                            className="game-player__quick-cmd"
                            onClick={() => handleQuickCommand(cmd)}
                          >
                            {cmd.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ApiSettings
        open={apiOpen}
        onClose={() => {
          setLlmConfig(getLlmConfig())
          setApiOpen(false)
        }}
      />
    </div>
  )
}
