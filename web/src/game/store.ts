import { create } from 'zustand'
import { MAX_DAMAGE_POINTS } from '../config/constants'
import {
  applyDamage,
  computeKoLockUntil,
  defenseBlocksPunch,
  deriveFighterMode,
  getHandPercents,
  nextAttackIfAvailable,
  pickDefenseType,
} from './mechanics'
import type { AttackEvent, FighterState, MarketSnapshot } from './types'

interface GameState {
  satoshi: FighterState
  lizard: FighterState
  lastAttack: AttackEvent | null
  alignCharacters: boolean
  applyMarketTick: (market: MarketSnapshot, ts?: number) => void
  toggleCharacterAlignment: () => void
  resetDamage: () => void
}

const createFighter = (name: FighterState['name']): FighterState => ({
  name,
  mode: 'defense',
  defenseType: 'none',
  pose: 'idle',
  damagePoints: 0,
  koLockedUntil: 0,
  lastAttackAt: 0,
})

const nextPose = (fighter: FighterState, ts: number): FighterState['pose'] => {
  if (ts >= fighter.koLockedUntil) {
    return fighter.mode === 'offense' ? 'attacking' : fighter.mode === 'defense' ? 'defending' : 'idle'
  }

  const fallEndsAt = fighter.koLockedUntil - (5000 + 4600)
  const knockedDownEndsAt = fighter.koLockedUntil - 4600
  if (ts < fallEndsAt) {
    return 'fall'
  }
  if (ts < knockedDownEndsAt) {
    return 'knockedDown'
  }
  return 'rise'
}

const buildUpdatedFighter = (
  fighter: FighterState,
  mode: FighterState['mode'],
  defenseType: FighterState['defenseType'],
  ts: number,
): FighterState => ({
  ...fighter,
  mode,
  defenseType,
  pose: nextPose({ ...fighter, mode }, ts),
})

export const useGameStore = create<GameState>((set, get) => ({
  satoshi: createFighter('satoshi'),
  lizard: createFighter('lizard'),
  lastAttack: null,
  alignCharacters: false,

  applyMarketTick: (market, ts = Date.now()) => {
    const current = get()
    const buyPercents = getHandPercents(market, 'buy')
    const sellPercents = getHandPercents(market, 'sell')

    let satoshi = buildUpdatedFighter(
      current.satoshi,
      deriveFighterMode(market.binance.buyVolume + market.coinbase.buyVolume, market.binance.sellVolume + market.coinbase.sellVolume),
      pickDefenseType(buyPercents.leftPercent, buyPercents.rightPercent),
      ts,
    )

    let lizard = buildUpdatedFighter(
      current.lizard,
      deriveFighterMode(market.binance.sellVolume + market.coinbase.sellVolume, market.binance.buyVolume + market.coinbase.buyVolume),
      pickDefenseType(buyPercents.leftPercent, buyPercents.rightPercent),
      ts,
    )

    let lastAttack: AttackEvent | null = null

    const satoshiPunch = nextAttackIfAvailable(satoshi, ts, buyPercents.leftPercent)
    if (satoshi.mode === 'offense' && satoshiPunch) {
      const landed = !defenseBlocksPunch(lizard.defenseType, satoshiPunch, 'left')
      satoshi = { ...satoshi, lastAttackAt: ts, pose: 'attacking' }
      lizard = landed
        ? {
            ...lizard,
            damagePoints: applyDamage(lizard.damagePoints, satoshiPunch),
          }
        : { ...lizard }
      lastAttack = { attacker: 'satoshi', hand: 'left', punchType: satoshiPunch, landed, ts }
    }

    const lizardPunch = nextAttackIfAvailable(lizard, ts, sellPercents.rightPercent)
    if (lizard.mode === 'offense' && lizardPunch) {
      const landed = !defenseBlocksPunch(satoshi.defenseType, lizardPunch, 'right')
      lizard = { ...lizard, lastAttackAt: ts, pose: 'attacking' }
      satoshi = landed
        ? {
            ...satoshi,
            damagePoints: applyDamage(satoshi.damagePoints, lizardPunch),
          }
        : { ...satoshi }
      lastAttack = { attacker: 'lizard', hand: 'right', punchType: lizardPunch, landed, ts }
    }

    if (satoshi.damagePoints >= MAX_DAMAGE_POINTS) {
      satoshi = {
        ...satoshi,
        damagePoints: 0,
        koLockedUntil: computeKoLockUntil(ts),
        pose: 'fall',
      }
    }
    if (lizard.damagePoints >= MAX_DAMAGE_POINTS) {
      lizard = {
        ...lizard,
        damagePoints: 0,
        koLockedUntil: computeKoLockUntil(ts),
        pose: 'fall',
      }
    }

    set({ satoshi, lizard, lastAttack })
  },

  toggleCharacterAlignment: () => {
    set((state) => ({ alignCharacters: !state.alignCharacters }))
  },

  resetDamage: () => {
    set((state) => ({
      satoshi: { ...state.satoshi, damagePoints: 0 },
      lizard: { ...state.lizard, damagePoints: 0 },
    }))
  },
}))
