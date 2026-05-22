import { useEffect } from 'react'
import { useTypewriter } from '../hooks/useTypewriter'

type Props = {
  text: string
  active: boolean
  onComplete?: () => void
}

export default function TypewriterText({ text, active, onComplete }: Props) {
  const displayed = useTypewriter(text, active)
  const typing = active && displayed.length < text.length

  useEffect(() => {
    if (active && !typing && text.length > 0) {
      onComplete?.()
    }
  }, [active, typing, text.length, onComplete])

  return (
    <>
      {displayed}
      {typing && <span className="typewriter-cursor">▌</span>}
    </>
  )
}
