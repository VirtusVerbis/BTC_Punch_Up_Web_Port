import { useEffect, useState } from 'react'
import { BG2_SHOW_INTERVAL_MS, BG2_VISIBLE_DURATION_MS } from './androidMirrorConstants'

/** Periodic candle chart visibility (Android BG2). */
export const useBg2ChartVisible = (): boolean => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = () => {
      setVisible(true)
      window.setTimeout(() => setVisible(false), BG2_VISIBLE_DURATION_MS)
    }
    show()
    const id = window.setInterval(show, BG2_SHOW_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  return visible
}
