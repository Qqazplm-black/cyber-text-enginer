import { useEffect, useState } from 'react'

export function useTypewriter(
  text: string,
  enabled: boolean,
  charsPerTick = 2,
  intervalMs = 24,
): string {
  const [displayed, setDisplayed] = useState(enabled ? '' : text)

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text)
      return
    }

    setDisplayed('')
    let index = 0
    const id = window.setInterval(() => {
      index = Math.min(text.length, index + charsPerTick)
      setDisplayed(text.slice(0, index))
      if (index >= text.length) {
        window.clearInterval(id)
      }
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [text, enabled, charsPerTick, intervalMs])

  return displayed
}
