import { useEffect, useState } from 'react'
import type { GenesisPersonality } from '../types/genesis'

type Props = {
  personality: GenesisPersonality
  onMockMessages: (messages: string[]) => void
}

const MOCK_MESSAGES: Record<GenesisPersonality, string[]> = {
  pragmatic: [
    '这个世界的规则似乎还不够严密——如果玩家选择无视主线，会发生什么？',
    '建议补充一个「理智值」系统，当角色目睹超自然现象时 sanity 会下降。',
  ],
  artist: [
    '太棒了！我仿佛已经看到霓虹灯下飘着数据雨的赛博街道了！',
    '要不要加入一个「记忆碎片」收集系统？每找到一片就解锁一段被封印的往事✨',
  ],
}

export default function AIGenerationIndicator({
  personality,
  onMockMessages,
}: Props) {
  const [phase, setPhase] = useState<'spark' | 'messages' | 'done'>('spark')

  useEffect(() => {
    // 2.5s 后隐藏星火动图，渲染 mock 追问文本
    const timer = setTimeout(() => {
      setPhase('messages')
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  // 逐条显示 mock 消息
  const [visibleMessages, setVisibleMessages] = useState<string[]>([])
  useEffect(() => {
    if (phase !== 'messages') return

    const msgs = MOCK_MESSAGES[personality]
    let index = 0
    const interval = setInterval(() => {
      if (index < msgs.length) {
        setVisibleMessages((prev) => [...prev, msgs[index]])
        index++
      } else {
        clearInterval(interval)
        setPhase('done')
        onMockMessages(msgs)
      }
    }, 600)

    return () => clearInterval(interval)
  }, [phase, personality, onMockMessages])

  const isPragmatic = personality === 'pragmatic'

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto px-4 py-6">
      {/* ---- 星火动图阶段 ---- */}
      {phase === 'spark' && (
        <div className="flex flex-col items-center gap-5">
          {/* 星火图标 */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            {isPragmatic ? (
              /* 务实模式：缓慢旋转的蓝色四角星 */
              <>
                <svg
                  className="absolute inset-0 w-full h-full animate-spin"
                  style={{ animationDuration: '4s' }}
                  viewBox="0 0 64 64"
                  fill="none"
                >
                  <path
                    d="M32 4 L36 24 L56 28 L36 32 L32 52 L28 32 L8 28 L28 24 Z"
                    className="fill-blue-400/80"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.6))' }}
                  />
                </svg>
                {/* 流光骨架屏 */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-400/20 animate-pulse" />
                <div
                  className="absolute inset-0 rounded-full border-t-2 border-blue-400/60 animate-spin"
                  style={{ animationDuration: '2s' }}
                />
              </>
            ) : (
              /* 疯狂模式：呼吸波动的紫色星尘簇 */
              <>
                {/* 主星 */}
                <svg
                  className="absolute inset-0 w-full h-full animate-pulse"
                  style={{ animationDuration: '1.5s' }}
                  viewBox="0 0 64 64"
                  fill="none"
                >
                  <circle cx="32" cy="32" r="8" className="fill-purple-400/90" />
                  {/* 星尘粒子 */}
                  <circle cx="20" cy="18" r="2.5" className="fill-purple-300/70">
                    <animate
                      attributeName="opacity"
                      values="0.3;1;0.3"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle cx="44" cy="20" r="2" className="fill-purple-300/60">
                    <animate
                      attributeName="opacity"
                      values="0.5;1;0.5"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle cx="46" cy="42" r="3" className="fill-purple-300/70">
                    <animate
                      attributeName="opacity"
                      values="0.2;0.9;0.2"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle cx="16" cy="40" r="1.8" className="fill-purple-300/50">
                    <animate
                      attributeName="opacity"
                      values="0.4;1;0.4"
                      dur="2.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle cx="28" cy="48" r="2.2" className="fill-purple-300/60">
                    <animate
                      attributeName="opacity"
                      values="0.3;0.8;0.3"
                      dur="1.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle cx="38" cy="12" r="1.5" className="fill-purple-300/50">
                    <animate
                      attributeName="opacity"
                      values="0.6;1;0.6"
                      dur="1.9s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
                {/* 流光骨架屏 */}
                <div className="absolute inset-0 rounded-full border-2 border-purple-400/20 animate-pulse" />
                <div
                  className="absolute inset-0 rounded-full border-t-2 border-purple-400/60 animate-spin"
                  style={{ animationDuration: '1.5s' }}
                />
              </>
            )}
          </div>

          {/* 流光骨架屏（长条） */}
          <div className="relative w-full h-3 rounded-full bg-gray-200/30 dark:bg-gray-700/30 overflow-hidden">
            <div
              className={`absolute inset-y-0 w-1/3 rounded-full ${isPragmatic ? 'bg-blue-400/40' : 'bg-purple-400/40'} animate-slide-sweep`}
              style={{
                background: isPragmatic
                  ? 'linear-gradient(90deg, transparent, rgba(96,165,250,0.5), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(192,132,252,0.5), transparent)',
              }}
            />
          </div>

          {/* 三个跳动的思考圆点 */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`inline-block w-2 h-2 rounded-full ${isPragmatic ? 'bg-blue-400' : 'bg-purple-400'} animate-bounce`}
                style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
              />
            ))}
          </div>

          <p className={`text-sm font-medium ${isPragmatic ? 'text-blue-500' : 'text-purple-500'}`}>
            {isPragmatic ? 'AI 正在分析规则漏洞…' : 'AI 正在编织奇幻设定…'}
          </p>
        </div>
      )}

      {/* ---- Mock 追问文本阶段 ---- */}
      {phase === 'messages' && (
        <div className="flex flex-col gap-3 w-full">
          {visibleMessages.map((msg, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 animate-fade-in-up"
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0 mt-0.5 ${isPragmatic ? 'bg-blue-500' : 'bg-purple-500'}`}
              >
                AI
              </span>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl px-3.5 py-2.5 rounded-tl-sm">
                {msg}
              </p>
            </div>
          ))}

          {/* 还在逐条显示时的闪烁光标 */}
          {visibleMessages.length < MOCK_MESSAGES[personality].length && (
            <div className="flex items-center gap-1.5 pl-9">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
