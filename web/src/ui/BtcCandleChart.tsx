import { useCallback, useEffect, useRef } from 'react'
import type { Candle } from '../data/candles'

const CHART_BG = '#000000'
const CANDLE_GREEN = '#00c853'
const CANDLE_RED = '#d50000'
const LABEL = 'rgba(255,255,255,0.8)'
const PADDING = 4
const MIN_CANDLE_WIDTH = 2
const WICK = 1

const formatPriceShort = (price: number): string => {
  if (price >= 1_000_000) {
    const v = price / 1e6
    return v === Math.trunc(v) ? `${v.toFixed(0)}M` : `${v.toFixed(1)}M`
  }
  if (price >= 1000) {
    const v = price / 1000
    return v === Math.trunc(v) ? `${v.toFixed(0)}K` : `${v.toFixed(1)}K`
  }
  return `${Math.round(price)}`
}

interface BtcCandleChartProps {
  candles: Candle[]
  showAxisLabels?: boolean
}

export const BtcCandleChart = ({ candles, showAxisLabels = true }: BtcCandleChartProps) => {
  const ref = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w <= 0 || h <= 0) return
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = CHART_BG
    ctx.fillRect(0, 0, w, h)

    if (candles.length === 0) {
      ctx.fillStyle = LABEL
      ctx.font = '12px system-ui'
      ctx.fillText('No candle data', PADDING, 16)
      return
    }

    const lows = candles.map((c) => c.low).sort((a, b) => a - b)
    const highs = candles.map((c) => c.high).sort((a, b) => a - b)
    const closes = candles.map((c) => c.close)
    const loIdx = Math.max(0, Math.floor(lows.length * 0.02))
    const hiIdx = Math.min(highs.length - 1, Math.ceil(highs.length * 0.98) - 1)
    const qLow = lows[loIdx] ?? Math.min(...candles.map((c) => c.low))
    const qHigh = highs[hiIdx] ?? Math.max(...candles.map((c) => c.high))
    const closeMin = Math.min(...closes)
    const closeMax = Math.max(...closes)
    const priceMin = Math.min(qLow, closeMin)
    const priceMax = Math.max(qHigh, closeMax)
    const priceRange = Math.max(1, priceMax - priceMin)
    const pad = Math.max(priceRange * 0.04, priceMax * 0.0005)
    const yMin = priceMin - pad
    const yMax = priceMax + pad
    const yRange = Math.max(1, yMax - yMin)

    const axisW = showAxisLabels ? 40 : 0
    const axisH = showAxisLabels ? 20 : 0
    const chartLeft = PADDING + axisW
    const chartRight = w - PADDING
    const chartTop = PADDING
    const chartBottom = h - PADDING - axisH
    const chartW = Math.max(1, chartRight - chartLeft)
    const chartH = Math.max(1, chartBottom - chartTop)

    const n = candles.length
    const candleW = Math.max(MIN_CANDLE_WIDTH, chartW / n)
    const gap = n > 1 ? (chartW - candleW * n) / (n - 1) : 0

    candles.forEach((c, index) => {
      const xCenter = chartLeft + (index + 0.5) * (candleW + gap)
      const y = (v: number) => chartBottom - ((v - yMin) / yRange) * chartH
      const openY = y(c.open)
      const closeY = y(c.close)
      const plotHigh = Math.min(Math.max(c.high, yMin), yMax)
      const plotLow = Math.max(Math.min(c.low, yMax), yMin)
      const highY = y(plotHigh)
      const lowY = y(plotLow)
      const bodyTop = Math.min(openY, closeY)
      const bodyBottom = Math.max(openY, closeY)
      const bodyHeight = Math.max(1, bodyBottom - bodyTop)
      const color = c.close >= c.open ? CANDLE_GREEN : CANDLE_RED

      ctx.strokeStyle = color
      ctx.lineWidth = WICK
      ctx.beginPath()
      ctx.moveTo(xCenter, highY)
      ctx.lineTo(xCenter, lowY)
      ctx.stroke()

      ctx.fillStyle = color
      ctx.fillRect(xCenter - candleW / 2, bodyTop, candleW, bodyHeight)
    })

    if (showAxisLabels) {
      ctx.fillStyle = LABEL
      ctx.font = '10px system-ui'
      const ticks = 5
      for (let i = 0; i < ticks; i++) {
        const price = yMax - (i * (yMax - yMin)) / (ticks - 1)
        ctx.fillText(`$${formatPriceShort(price)}`, 2, chartTop + (i * chartH) / (ticks - 1) + 8)
      }
    }
  }, [candles, showAxisLabels])

  useEffect(() => {
    draw()
    const canvas = ref.current
    if (!canvas || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [draw])

  return <canvas ref={ref} className="btc-candle-chart" />
}
