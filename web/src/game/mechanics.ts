import {
  KO_SEQUENCE_MS,
  MAX_DAMAGE_POINTS,
  PUNCH_COOLDOWNS_MS,
  PUNCH_DAMAGE,
  PUNCH_THRESHOLDS,
} from '../config/constants'
import type {
  DefenseType,
  FighterState,
  Hand,
  MarketSnapshot,
  Mode,
  PunchType,
} from './types'

const toPercent = (value: number, maxValue: number): number => {
  if (maxValue <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round((value / maxValue) * 100)))
}

export const pickPunchType = (percent: number): PunchType => {
  for (const band of PUNCH_THRESHOLDS) {
    if (percent <= band.maxPercent) {
      return band.type
    }
  }
  return 'uppercut'
}

export const pickDefenseType = (
  binanceBuyPercent: number,
  coinbaseBuyPercent: number,
): DefenseType => {
  const highest = Math.max(binanceBuyPercent, coinbaseBuyPercent)
  if (highest >= 57) {
    return 'headBlock'
  }
  if (highest >= 24) {
    return 'bodyBlock'
  }
  if (binanceBuyPercent >= 1 && binanceBuyPercent <= 23) {
    return 'dodgeLeft'
  }
  if (coinbaseBuyPercent >= 1 && coinbaseBuyPercent <= 23) {
    return 'dodgeRight'
  }
  return 'none'
}

export const defenseBlocksPunch = (
  defenseType: DefenseType,
  punchType: PunchType,
  hand: Hand,
): boolean => {
  if (punchType === 'uppercut') {
    return defenseType === 'headBlock'
  }
  if (punchType === 'hook' || punchType === 'cross') {
    return defenseType === 'bodyBlock'
  }
  if (hand === 'left') {
    return defenseType === 'dodgeRight'
  }
  return defenseType === 'dodgeLeft'
}

export const deriveFighterMode = (buyVolume: number, sellVolume: number): Mode =>
  buyVolume > sellVolume ? 'offense' : 'defense'

export const getHandPercents = (market: MarketSnapshot, volumeType: 'buy' | 'sell') => {
  const binanceVolume = volumeType === 'buy' ? market.binance.buyVolume : market.binance.sellVolume
  const coinbaseVolume =
    volumeType === 'buy' ? market.coinbase.buyVolume : market.coinbase.sellVolume
  const maxVolume = Math.max(binanceVolume, coinbaseVolume, 1)

  return {
    leftPercent: toPercent(binanceVolume, maxVolume),
    rightPercent: toPercent(coinbaseVolume, maxVolume),
  }
}

export const nextAttackIfAvailable = (
  fighter: FighterState,
  ts: number,
  handPercent: number,
): PunchType | null => {
  if (ts < fighter.koLockedUntil) {
    return null
  }
  const punchType = pickPunchType(handPercent)
  const cooldown = PUNCH_COOLDOWNS_MS[punchType]
  if (ts - fighter.lastAttackAt < cooldown) {
    return null
  }
  return punchType
}

export const applyDamage = (currentDamage: number, punchType: PunchType): number =>
  Math.min(MAX_DAMAGE_POINTS, currentDamage + PUNCH_DAMAGE[punchType])

export const computeKoLockUntil = (ts: number): number =>
  ts + KO_SEQUENCE_MS.fall + KO_SEQUENCE_MS.knockedDown + KO_SEQUENCE_MS.rise
