import { listGameHistory } from '../storage/history'
import './Sidebar.css'

type Props = {
  isOpen: boolean
  onClose: () => void
  onNewGenesis: () => void
  onContinueGame: (gameId: string) => void
}

export default function Sidebar({ isOpen, onClose, onNewGenesis, onContinueGame }: Props) {
  const games = listGameHistory()

  return (
    <>
      {/* 背景遮罩 — 点击即关 */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'sidebar-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 抽屉本体 — fixed 覆盖式 */}
      <aside
        className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}
        aria-label="导航侧边栏"
      >
        <div className="sidebar__inner">
          {/* 顶部：关闭按钮 + 新创世按钮 */}
          <div className="sidebar__header">
            <button
              type="button"
              className="sidebar__close-btn"
              onClick={onClose}
              aria-label="关闭侧边栏"
            >
              ✕
            </button>
            <button
              type="button"
              className="sidebar__new-btn"
              onClick={onNewGenesis}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v10M3 8h10" />
              </svg>
              <span>新创世</span>
            </button>
          </div>

          {/* 历史记录 */}
          <div className="sidebar__history">
            <h2 className="sidebar__section-title">历史记录</h2>
            {games.length === 0 ? (
              <p className="sidebar__empty">暂无游戏记录</p>
            ) : (
              <ul className="sidebar__list">
                {games.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className="sidebar__history-item"
                      onClick={() => onContinueGame(g.id)}
                    >
                      <span className="sidebar__history-title">{g.title}</span>
                      <span className="sidebar__history-date">
                        {new Date(g.updatedAt).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
