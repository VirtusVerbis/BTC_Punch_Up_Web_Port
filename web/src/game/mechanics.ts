import {
  KO_SEQUENCE_MS,
  MAX_DAMAGE_POINTS,
  PUNCH_COOLDOWNS_MS,
  PUNCH_DAMAGE,
  PUNCH_THRESHOLDS,
} from '../config/constants'
import { MIN_IDLE_AFTER_DEFENSE_MS } from '../ui/androidMirrorConstants'
import type {
  DefenseType,
  FighterState,
  Hand,
  MarketSnapshot,
  Mode,
  PunchType,
} from './types'

/** Initial map for `FighterState.lastPunchUsedAt` (epoch = never used). */
export const createEmptyLastPunchUsedAt = (): Record<PunchType, number> => ({
  jab: 0,
  body: 0,
  hook: 0,
  cross: 0,
  uppercut: 0,
})

const toPercent = (value: number, maxValue: number): number => {
  if (maxValue <= 0) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round((value / maxValue) * 100)))
}

/** Android `getPunchTypeFromVolume`: null when no positive volume or max. */
export const pickPunchTypeFromPercent = (percent: number | null): PunchType | null => {
  if (percent === null || percent <= 0) return null
  for (const band of PUNCH_THRESHOLDS) {
    if (percent <= band.maxPercent) {
      return band.type
    }
  }
  return 'uppercut'
}

export const pickPunchType = (percent: number): PunchType => pickPunchTypeFromPercent(percent) ?? 'jab'

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

const DEFENSE_SWITCH_COOLDOWN_MS: Record<Exclude<DefenseType, 'none'>, number> = {
  headBlock: 1000,
  bodyBlock: 1000,
  dodgeLeft: 1000,
  dodgeRight: 1000,
}

/** Android: keep previous defense type if still inside its cooldown when raw type changes. */
export const resolveDefenseTypeWithCooldown = (
  raw: DefenseType,
  effective: DefenseType,
  defenseCommittedAt: number,
  ts: number,
): DefenseType => {
  if (raw === effective) return effective
  if (effective !== 'none' && ts - defenseCommittedAt < DEFENSE_SWITCH_COOLDOWN_MS[effective]) {
    return effective
  }
  return raw
}

/** Android: after leaving defense mode, suppress non-`none` defense briefly while still in offense. */
export const gateDefenseAfterLeavingDefense = (
  mode: Mode,
  rawDefense: DefenseType,
  prevMode: Mode,
  ts: number,
  prevReenterNotBefore: number,
): { defense: DefenseType; reenterNotBefore: number } => {
  let reenterNotBefore = prevReenterNotBefore
  if (prevMode === 'defense' && mode === 'offense') {
    reenterNotBefore = ts + MIN_IDLE_AFTER_DEFENSE_MS
  }
  if (mode === 'offense' && rawDefense !== 'none' && ts < reenterNotBefore) {
    return { defense: 'none', reenterNotBefore }
  }
  return { defense: rawDefense, reenterNotBefore }
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

/** Satoshi ring mode: Binance buy vs sell only (Android `isBinanceDefense` gate). */
export const deriveSatoshiRingMode = (market: MarketSnapshot): Mode =>
  deriveFighterMode(market.binance.buyVolume, market.binance.sellVolume)

/** Lizard ring mode: opposite of Binance imbalance (Android `isLizardDefense = !isBinanceDefense`). */
export const deriveLizardRingMode = (market: MarketSnapshot): Mode =>
  deriveFighterMode(market.binance.sellVolume, market.binance.buyVolume)

export interface HandPercents {
  leftPercent: number | null
  rightPercent: number | null
}

export const getHandPercents = (market: MarketSnapshot, volumeType: 'buy' | 'sell'): HandPercents => {
  const binanceVolume = volumeType === 'buy' ? market.binance.buyVolume : market.binance.sellVolume
  const coinbaseVolume =
    volumeType === 'buy' ? market.coinbase.buyVolume : market.coinbase.sellVolume
  const maxVolume = Math.max(binanceVolume, coinbaseVolume)
  if (maxVolume <= 0) {
    return { leftPercent: null, rightPercent: null }
  }
  return {
    leftPercent: binanceVolume > 0 ? toPercent(binanceVolume, maxVolume) : null,
    rightPercent: coinbaseVolume > 0 ? toPercent(coinbaseVolume, maxVolume) : null,
  }
}

/** Pick which hand/punch to execute when left/right exchange percents yield independent types (Satoshi buy-side, Lizard sell-side). */
export const selectDualHandPunch = (
  left: PunchType | null,
  right: PunchType | null,
  priorityHand: Hand,
): { hand: Hand; punchType: PunchType } | null => {
  if (left === null && right === null) return null
  if (left !== null && right !== null) {
    if (priorityHand === 'right') return { hand: 'right', punchType: right }
    return { hand: 'left', punchType: left }
  }
  if (left !== null) return { hand: 'left', punchType: left }
  return { hand: 'right', punchType: right as PunchType }
}

export const nextAttackIfAvailable = (
  fighter: FighterState,
  ts: number,
  handPercent: number | null,
): PunchType | null => {
  if (ts < fighter.koLockedUntil) {
    return null
  }
  const punchType = pickPunchTypeFromPercent(handPercent)
  if (punchType === null) return null
  const cooldown = PUNCH_COOLDOWNS_MS[punchType]
  const lastUsed = fighter.lastPunchUsedAt[punchType]
  if (lastUsed > 0 && ts - lastUsed < cooldown) {
    return null
  }
  return punchType
}

export const applyDamage = (currentDamage: number, punchType: PunchType): number =>
  Math.min(MAX_DAMAGE_POINTS, currentDamage + PUNCH_DAMAGE[punchType])

export const computeKoLockUntil = (ts: number): number =>
  ts + KO_SEQUENCE_MS.fall + KO_SEQUENCE_MS.knockedDown + KO_SEQUENCE_MS.rise
