import { useCallback, useEffect, useState } from 'react'
import GenesisChat from './components/GenesisChat'
import GamePlayer from './components/GamePlayer'
import HomePage from './components/HomePage'
import Sidebar from './components/Sidebar'
import { useHashRoute } from './hooks/useHashRoute'
import { createHistoryId, upsertGameHistory } from './storage/history'
import './App.css'

function App() {
  const { route, navigate } = useHashRoute()
  const [guestGameId] = useState(() => createHistoryId())
  const [homeRefresh, setHomeRefresh] = useState(0)

  // ── 覆盖式抽屉侧边栏 ──
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  const handleNewGenesis = useCallback(() => {
    setIsSidebarOpen(false)
    navigate('#/')
  }, [navigate])

  const handleContinueGame = useCallback(
    (gameId: string) => {
      setIsSidebarOpen(false)
      navigate(`#/continue/${gameId}`)
    },
    [navigate],
  )

  useEffect(() => {
    if (route.name === 'play') {
      const { bundle } = route
      upsertGameHistory({
        id: guestGameId,
        title: bundle.game.title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        game: bundle.game,
        worldBook: bundle.worldBook,
        style: bundle.style,
        personality: null,
      })
    }
  }, [route, guestGameId])

  function renderMain() {
    if (route.name === 'home') {
      return (
        <HomePage
          key={homeRefresh}
          onContinue={(gameId) => navigate(`#/continue/${gameId}`)}
          onPlayShared={(hash) => navigate(hash)}
          onRefresh={() => setHomeRefresh((k) => k + 1)}
        />
      )
    }

    if (route.name === 'play') {
      const { bundle } = route
      return (
        <GamePlayer
          game={bundle.game}
          gameId={guestGameId}
          worldBook={bundle.worldBook}
          style={bundle.style}
          onBackToGenesis={() => navigate('#/')}
        />
      )
    }

    if (route.name === 'continue') {
      return (
        <GenesisChat
          continueGameId={route.gameId}
          onNavigateHome={() => navigate('#/')}
        />
      )
    }

    return <GenesisChat onNavigateHome={() => navigate('#/')} />
  }

  return (
    <div className="app-layout">
      {/* 左上角常驻菜单按钮 */}
      <button
        type="button"
        className="app-layout__menu-btn"
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? '收起侧边栏' : '展开侧边栏'}
      >
        ☰
      </button>

      {/* 覆盖式抽屉侧边栏 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        onNewGenesis={handleNewGenesis}
        onContinueGame={handleContinueGame}
      />

      {/* 主内容区 — 全屏画卷（永远 100% 宽度） */}
      <main className="app-layout__main">
        {renderMain()}
      </main>
    </div>
  )
}

export default App
