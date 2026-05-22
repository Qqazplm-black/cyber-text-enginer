import { useEffect, useRef, useState } from 'react'
import { compileGame, GameCompileError } from '../engine/compileGame'
import { formatGameRules } from '../engine/formatGameRules'
import { chatGenesisTurn } from '../services/genesisChat'
import { getLlmConfig, validateLlmConfig } from '../services/llm/storage'
import type { LlmConfig } from '../services/llm/types'
import {
  createHistoryId,
  getGameHistory,
  upsertGameHistory,
} from '../storage/history'
import { buildShareUrl } from '../storage/share'
import type {
  CompiledGame,
  DisplayMessage,
  GameSpec,
  GenesisPersonality,
  SessionPhase,
} from '../types/genesis'
import type { WritingStyleProfile } from '../types/style'
import type { WorldBookSummary } from '../types/worldbook'
import ApiSettings from './ApiSettings'
import GamePlayer from './GamePlayer'
import TypewriterText from './TypewriterText'
import './GenesisChat.css'


/** 快捷指令定义（用于创世对话界面） */
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


function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 当AI在第3轮仍未返回完整游戏规格时，创建一个兜底游戏 */
function createFallbackGame(fallbackMessage?: string): GameSpec {
  const title = '未知世界'
  const intro = fallbackMessage
    ? fallbackMessage.slice(0, 200)
    : '一个由你的创意构筑的世界即将展开。'

  return {
    title,
    intro,
    startScene: 'opening',
    stats: [
      { key: 'hp', label: '生命值', initial: 100, max: 100 },
      { key: 'sanity', label: '理智值', initial: 100, max: 100 },
    ],
    scenes: {
      opening: {
        text: intro,
        choices: [
          { label: '探索周围', next: 'exploration', effects: { hp: 0, sanity: -5 } },
          { label: '谨慎观察', next: 'observation', effects: { hp: 0, sanity: 0 } },
        ],
      },
      exploration: {
        text: '你迈出脚步，踏入了这片未知的领域。四周的景象既陌生又令人兴奋。',
        choices: [
          { label: '继续深入', next: 'deep_dive', effects: { hp: -10, sanity: -10 } },
          { label: '原路返回', next: 'observation', effects: { hp: 0, sanity: 5 } },
        ],
      },
      observation: {
        text: '你停下脚步，仔细观察周围的环境。微风中似乎夹杂着某种讯息。',
        choices: [
          { label: '追寻讯息的来源', next: 'deep_dive', effects: { hp: 0, sanity: -5 } },
          { label: '保持警惕，慢慢前进', next: 'exploration', effects: { hp: 0, sanity: 0 } },
        ],
      },
      deep_dive: {
        text: '你来到了一个关键的地点。这里的氛围让你意识到，真正的冒险才刚刚开始。',
        choices: [
          { label: '勇敢面对', next: 'END', effects: { hp: -20, sanity: -15 } },
          { label: '寻找其他出路', next: 'END', effects: { hp: -5, sanity: -10 } },
        ],
      },
    },
  }
}

type Props = {
  continueGameId?: string | null
  onNavigateHome?: () => void
  /** 从 HomePage 传入的初始创作风格配置 */
  initialStyle?: WritingStyleProfile | null
  /** 从 HomePage 传入的初始世界书配置 */
  initialWorldBook?: WorldBookSummary | null
  /** 从 HomePage 传入的初始 AI 人格选择 */
  initialPersonality?: GenesisPersonality | null
}

export default function GenesisChat({
  continueGameId = null,
  onNavigateHome,
  initialStyle,
  initialWorldBook,
  initialPersonality,
}: Props) {
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(getLlmConfig)
  const [apiOpen, setApiOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [apiHistory, setApiHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([])
  const [phase, setPhase] = useState<SessionPhase>('welcome')
  const [gameRules, setGameRules] = useState<string | null>(null)
  const [compiledGame, setCompiledGame] = useState<CompiledGame | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [worldBook, setWorldBook] = useState<WorldBookSummary | null>(
    initialWorldBook ?? null,
  )
  const [style, setStyle] = useState<WritingStyleProfile | null>(
    initialStyle ?? null,
  )
  const [sessionKey, setSessionKey] = useState(0)
  const [personality, setPersonality] = useState<GenesisPersonality | null>(
    initialPersonality ?? null,
  )
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null)
  const [showQuickCommands, setShowQuickCommands] = useState(false)
  const threadEndRef = useRef<HTMLLIElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 计算用户与AI的对话轮数（每轮 = 1条用户消息 + 1条AI回复）
  const userMessages = messages.filter((m) => m.role === 'user')
  const conversationRounds = userMessages.length
  const maxRounds = 3
  const isMaxRoundsReached = conversationRounds >= maxRounds

  const hasConversation = messages.length > 0
  const isComplete = phase === 'complete'
  const isPlaying = phase === 'playing'

  useEffect(() => {
    if (continueGameId) {
      const entry = getGameHistory(continueGameId)
      if (entry) {
        setHistoryId(entry.id)
        setCompiledGame(entry.game)
        setWorldBook(entry.worldBook)
        setStyle(entry.style)
        setPersonality(entry.personality)
        setGameRules(formatGameRules(entry.game))
        setPhase('playing')
      }
    }
  }, [continueGameId])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase, loading, gameRules])

  useEffect(() => {
    if (!loading && !isComplete && !isPlaying) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [loading, isComplete, isPlaying, messages.length])

  function resetSession() {
    setInput('')
    setMessages([])
    setApiHistory([])
    setPhase('welcome')
    setGameRules(null)
    setCompiledGame(null)
    setHistoryId(null)
    setWorldBook(null)
    setStyle(null)
    setSessionKey((k) => k + 1)
    setPersonality(null)
    setShareUrl(null)
    setError(null)
    setLoading(false)
    setTypingMsgId(null)
    onNavigateHome?.()
  }

  function saveToHistory(game: CompiledGame) {
    const id = historyId ?? createHistoryId()
    setHistoryId(id)
    upsertGameHistory({
      id,
      title: game.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      game,
      worldBook,
      style,
      personality,
    })
    return id
  }

  /** 编译游戏并进入完成状态 */
  async function compileAndComplete(
    gameSpec: GameSpec | null,
    fallbackMessage?: string,
  ) {
    setPhase('compiling')
    try {
      // 如果AI没有返回有效的game规格（第3轮强制兜底），创建一个默认游戏
      const spec = gameSpec ?? createFallbackGame(fallbackMessage)
      const compiled: CompiledGame = compileGame(spec)
      setCompiledGame(compiled)
      setGameRules(formatGameRules(compiled))
      const id = saveToHistory(compiled)
      setHistoryId(id)
      try {
        setShareUrl(
          buildShareUrl({
            v: 1,
            game: compiled,
            worldBook,
            style,
          }),
        )
      } catch {
        setShareUrl(null)
      }
      setPhase('complete')
    } catch (err) {
      const msg =
        err instanceof GameCompileError
          ? err.message
          : '规则编译失败，请继续补充细节后重试'
      setError(msg)
      setPhase('chatting')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading || isComplete) return

    if (!personality) {
      setError('请先选择创世 AI 人格')
      return
    }

    const validation = validateLlmConfig(llmConfig)
    if (validation) {
      setError(validation)
      setApiOpen(true)
      return
    }

    setError(null)

    const prevMessages = messages
    const prevApiHistory = apiHistory

    const userMsg: DisplayMessage = {
      id: createId(),
      role: 'user',
      content: trimmed,
    }
    const nextApiHistory = [
      ...apiHistory,
      { role: 'user' as const, content: trimmed },
    ]

    setMessages((prev) => [...prev, userMsg])
    setApiHistory(nextApiHistory)
    setInput('')
    setPhase('chatting')
    setLoading(true)

    try {
      // 如果是第3轮，在API历史中追加一条强制完成指令
      let finalApiHistory = nextApiHistory
      if (isMaxRoundsReached) {
        finalApiHistory = [
          ...nextApiHistory,
          {
            role: 'user' as const,
            content: '（这是最后一轮对话，请直接返回 complete 状态并生成完整的游戏规格，不要再追问）',
          },
        ]
      }

      const genesis = await chatGenesisTurn(
        llmConfig,
        finalApiHistory,
        worldBook,
        personality,
      )

      const assistantId = createId()
      const assistantMsg: DisplayMessage = {
        id: assistantId,
        role: 'assistant',
        content: genesis.message,
      }


      setMessages((prev) => [...prev, assistantMsg])
      setTypingMsgId(assistantId)
      setApiHistory((prev) => [
        ...prev,
        { role: 'assistant', content: JSON.stringify(genesis) },
      ])

      // 如果AI返回complete，正常编译
      if (genesis.status === 'complete' && genesis.game) {
        await compileAndComplete(genesis.game)
      } else if (isMaxRoundsReached) {
        // 第3轮AI仍然返回gathering，强制编译（使用AI最后的消息内容生成默认游戏）
        await compileAndComplete(null, genesis.message)
      }
    } catch (err) {

      setMessages(prevMessages)
      setApiHistory(prevApiHistory)
      setInput(trimmed)
      setError(err instanceof Error ? err.message : '请求失败，请稍后重试')
    } finally {
      setLoading(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  function startGame() {
    if (compiledGame) {
      if (historyId) saveToHistory(compiledGame)
      setPhase('playing')
    }
  }

  function backFromPlay() {
    setPhase('complete')
  }

  async function copyShareLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setError('复制失败，请手动复制链接')
    }
  }

  if (isPlaying && compiledGame && historyId) {
    return (
      <GamePlayer
        game={compiledGame}
        gameId={historyId}
        worldBook={worldBook}
        style={style}
        onBackToGenesis={backFromPlay}
      />
    )
  }

  return (
    <div className="genesis-chat">
      <header className="genesis-chat__header">
        <div className="genesis-chat__header-left">
          <h1 className="genesis-chat__brand">Genesis Sandbox</h1>
        </div>
        <div className="genesis-chat__header-actions">
          {(hasConversation || isComplete) && (
            <button
              type="button"
              className="genesis-chat__key-toggle"
              onClick={resetSession}
              disabled={loading}
            >
              新对话
            </button>
          )}
          <button
            type="button"
            className="genesis-chat__key-toggle"
            onClick={() => setApiOpen(true)}
          >
            API 设置
          </button>
        </div>
      </header>

      <div className="genesis-chat__body">
        {!hasConversation && !isComplete && (
          <div className="genesis-chat__hero">
            <h1 className="genesis-chat__welcome">你想创造什么？</h1>
            <p className="genesis-chat__welcome-sub">描述你的创意，AI将为你编译成可玩的世界</p>
          </div>

        )}

        {hasConversation && (
          <ul className="genesis-chat__thread" aria-label="对话记录">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`genesis-chat__row genesis-chat__row--${msg.role}`}
              >
                <div
                  className={`genesis-chat__bubble genesis-chat__bubble--${msg.role}`}
                >
                  <span className="genesis-chat__bubble-label">
                    {msg.role === 'user' ? '你' : '创世 AI'}
                  </span>
                  <p>
                    {msg.role === 'assistant' && typingMsgId === msg.id ? (
                      <TypewriterText
                        text={msg.content}
                        active
                        onComplete={() => setTypingMsgId(null)}
                      />
                    ) : (
                      msg.content
                    )}
                  </p>
                </div>
              </li>
            ))}

            {loading && (
              <li className="genesis-chat__row genesis-chat__row--assistant">
                <div className="genesis-chat__bubble genesis-chat__bubble--assistant">
                  <span className="genesis-chat__bubble-label">创世 AI</span>
                  <p className="genesis-chat__typing">
                    {phase === 'compiling' ? '正在编译游戏规则…' : '思考中…'}
                  </p>
                </div>
              </li>
            )}

            {isComplete && gameRules && (
              <li className="genesis-chat__row genesis-chat__row--complete">
                <section className="genesis-chat__result" aria-live="polite">
                  <p className="genesis-chat__complete-badge">创世完成</p>
                  <h2 className="genesis-chat__rules-title">编译好的游戏规则</h2>
                  <pre className="genesis-chat__rules">{gameRules}</pre>
                  {shareUrl && (
                    <div className="genesis-chat__share">
                      <p className="genesis-chat__share-label">分享链接</p>
                      <input
                        className="genesis-chat__share-input"
                        readOnly
                        value={shareUrl}
                      />
                      <button
                        type="button"
                        className="genesis-chat__share-copy"
                        onClick={() => void copyShareLink()}
                      >
                        {shareCopied ? '已复制' : '复制链接'}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="genesis-chat__start-game"
                    onClick={startGame}
                  >
                    开始游戏
                  </button>
                </section>
              </li>
            )}

            <li className="genesis-chat__scroll-anchor" ref={threadEndRef} />
          </ul>
        )}

        {error && (
          <div className="genesis-chat__error-wrap" role="alert">
            <p className="genesis-chat__error">{error}</p>
            {input.trim() && !loading && (
              <button
                type="button"
                className="genesis-chat__retry"
                onClick={() => {
                  setError(null)
                  inputRef.current?.form?.requestSubmit()
                }}
              >
                重试
              </button>
            )}
          </div>
        )}
      </div>

      <footer className="genesis-chat__footer">
        {isComplete ? (
          <div className="genesis-chat__footer-complete">
            <button
              type="button"
              className="genesis-chat__start-game genesis-chat__start-game--footer"
              onClick={startGame}
            >
              开始游戏
            </button>
            {shareUrl && (
              <button
                type="button"
                className="genesis-chat__share-copy genesis-chat__share-copy--footer"
                onClick={() => void copyShareLink()}
              >
                {shareCopied ? '链接已复制' : '复制分享链接'}
              </button>
            )}
            <p className="genesis-chat__footer-done">
              或点击「新对话」重新创世
            </p>
          </div>
        ) : (
          <>
            <form className="genesis-chat__form" onSubmit={handleSubmit}>
              <div className="genesis-chat__input-wrap">
                <textarea
                  ref={inputRef}
                  className="genesis-chat__input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    hasConversation
                      ? '继续回答创世 AI 的问题…'
                      : '用一句核心创意定义你的世界'
                  }
                  rows={2}
                  disabled={loading || !!typingMsgId}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      e.currentTarget.form?.requestSubmit()
                    }
                  }}
                />
                <button
                  type="button"
                  className={`genesis-chat__quick-toggle${showQuickCommands ? ' genesis-chat__quick-toggle--active' : ''}`}
                  onClick={() => setShowQuickCommands((v) => !v)}
                  disabled={loading || !!typingMsgId}
                  title="快捷指令"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>
              <button
                type="submit"
                className="genesis-chat__submit"
                disabled={
                  loading || !input.trim() || !!typingMsgId
                }
              >
                {loading
                  ? phase === 'compiling'
                    ? '编译中…'
                    : '思考中…'
                  : hasConversation
                    ? '发送'
                    : '开始创世'}
              </button>
            </form>

            {/* 快捷指令弹出菜单 */}
            {showQuickCommands && (
              <div className="genesis-chat__quick-commands">
                {QUICK_COMMANDS.map((cmd) => (
                  <button
                    key={cmd.label}
                    type="button"
                    className="genesis-chat__quick-cmd"
                    onClick={() => {
                      setShowQuickCommands(false)
                      if (cmd.instant) {
                        // 直接触发提交
                        setInput(cmd.prefix)
                        // 使用 setTimeout 确保状态更新后再提交
                        setTimeout(() => {
                          const form = inputRef.current?.form
                          if (form) form.requestSubmit()
                        }, 0)
                      } else {
                        // 填入输入框让用户补充
                        setInput(cmd.prefix)
                        inputRef.current?.focus()
                      }
                    }}
                  >
                    {cmd.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </footer>

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
