import { useEffect, useState } from 'react'

export function useTypewriter(text: string, { charsPerTick = 2, tickMs = 24, enabled = true } = {}) {
  const [written, setWritten] = useState({ text, length: 0 })
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const length = written.text === text ? written.length : 0
  const instant = !enabled || reducedMotion
  const done = instant || length >= text.length
  useEffect(() => {
    if (done) return
    const timer = window.setInterval(
      () => {
        setWritten((current) => ({
          text,
          length: Math.min(
            text.length,
            (current.text === text ? current.length : 0) + Math.max(1, charsPerTick),
          ),
        }))
      },
      Math.max(1, tickMs),
    )
    return () => window.clearInterval(timer)
  }, [text, charsPerTick, tickMs, done])
  return {
    visible: instant ? text : text.slice(0, length),
    done,
    complete: () => setWritten({ text, length: text.length }),
  }
}
