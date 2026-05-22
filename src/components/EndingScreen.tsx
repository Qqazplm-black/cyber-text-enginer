import { useEffect, useState } from 'react'
import { ENDING_META, type EndingType } from '../types/genesis'
import './EndingScreen.css'

type Props = {
  type: EndingType
  message: string
  narrative: string
  onBack: () => void
}

export default function EndingScreen({
  type,
  message,
  narrative,
  onBack,
}: Props) {
  const meta = ENDING_META[type]
  const [visible, setVisible] = useState(false)
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    // 入场动画
    const t1 = setTimeout(() => setVisible(true), 100)
    const t2 = setTimeout(() => setShowMessage(true), 800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className={`ending-screen ${meta.className}${visible ? ' ending-screen--visible' : ''}`}>
      <div className="ending-screen__badge-wrap">
        <span className="ending-screen__badge">{meta.title}</span>
      </div>
      <p className="ending-screen__subtitle">{meta.subtitle}</p>
      <div className="ending-screen__body">
        <p className="ending-screen__narrative">{narrative}</p>
        {message && (
          <p className={`ending-screen__message${showMessage ? ' ending-screen__message--show' : ''}`}>
            {message}
          </p>
        )}
      </div>
      <button
        type="button"
        className="ending-screen__btn"
        onClick={onBack}
      >
        返回首页
      </button>
    </div>
  )
}
