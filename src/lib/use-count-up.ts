import { useEffect, useRef, useState } from 'react'

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Número de HUD que corre até o valor novo (moeda, fragmentos). Devolve o valor mostrado agora e a última variação
 * (`delta`, com uma `key` nova a cada mudança, para animar o "+130" subindo). Sem movimento: pula direto.
 */
export function useCountUp(value: number, duration = 700) {
  const [shown, setShown] = useState(value)
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null)
  const current = useRef(value)
  const target = useRef(value)

  useEffect(() => {
    if (value === target.current) return
    setDelta((d) => ({ value: value - target.current, key: (d?.key ?? 0) + 1 }))
    target.current = value

    const from = current.current
    if (reducedMotion()) {
      current.current = value
      setShown(value)
      return
    }

    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const next = Math.round(from + (value - from) * (1 - (1 - p) ** 3))
      current.current = next
      setShown(next)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return { shown, delta }
}
