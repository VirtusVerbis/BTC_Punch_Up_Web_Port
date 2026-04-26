import { create } from 'zustand'
import { MAX_DAMAGE_POINTS } from '../config/constants'
import {
  applyDamage,
  computeKoLockUntil,
  createEmptyLastPunchUsedAt,
  defenseBlocksPunch,
  deriveFighterMode,
  getHandPercents,
  nextAttackIfAvailable,
  pickDefenseType,
  selectDualHandPunch,
} from './mechanics'
import { computePunchImpactAt, computePunchSequenceEndAt } from './punchFrames'
import { PUNCH_PRIORITY_HAND } from '../ui/androidMirrorConstants'
import type { AttackEvent, FighterState, MarketSnapshot, PunchSequence } from './types'

interface GameState {
  satoshi: FighterState
  lizard: FighterState
  lastAttack: AttackEvent | null
  /** At most one punch sequence at a time (wind-up → impact → recovery). */
  activePunchSequence: PunchSequence | null
  alignCharacters: boolean
  /** KOs scored by Satoshi (Lizard knocked out). Mirrors Android `satoshiKOCount`. */
  satoshiKoCount: number
  /** KOs scored by Lizard (Satoshi knocked out). Mirrors Android `lizardKOCount`. */
  lizardKoCount: number
  applyMarketTick: (market: MarketSnapshot, ts?: number) => void
  advanceCombat: (ts?: number) => void
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
  lastPunchUsedAt: createEmptyLastPunchUsedAt(),
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
  activePunchSequence: null,
  alignCharacters: false,
  satoshiKoCount: 0,
  lizardKoCount: 0,

  advanceCombat: (ts = Date.now()) => {
    set((state) => {
      const seq0 = state.activePunchSequence
      if (!seq0) return {}

      let seq = seq0
      let satoshi = state.satoshi
      let lizard = state.lizard
      let lastAttack = state.lastAttack
      let satoshiKoCount = state.satoshiKoCount
      let lizardKoCount = state.lizardKoCount
      let changed = false

      if (!seq.impactResolved && ts >= seq.impactAt) {
        changed = true
        const defenderName: 'lizard' | 'satoshi' = seq.attacker === 'satoshi' ? 'lizard' : 'satoshi'
        let defender = defenderName === 'lizard' ? lizard : satoshi
        const landed = !defenseBlocksPunch(defender.defenseType, seq.punchType, seq.hand)
        defender = landed
          ? { ...defender, damagePoints: applyDamage(defender.damagePoints, seq.punchType) }
          : { ...defender }
        if (defenderName === 'lizard') lizard = defender
        else satoshi = defender

        lastAttack = {
          attacker: seq.attacker,
          hand: seq.hand,
          punchType: seq.punchType,
          landed,
          ts: seq.impactAt,
          startedTs: seq.startTs,
        }
        seq = { ...seq, impactResolved: true }

        const lizardKo = lizard.damagePoints >= MAX_DAMAGE_POINTS
        const satoshiKo = satoshi.damagePoints >= MAX_DAMAGE_POINTS
        if (lizardKo) satoshiKoCount = state.satoshiKoCount + 1
        if (satoshiKo) lizardKoCount = state.lizardKoCount + 1
        if (satoshiKo) {
          satoshi = {
            ...satoshi,
            damagePoints: 0,
            koLockedUntil: computeKoLockUntil(ts),
            pose: 'fall',
          }
        }
        if (lizardKo) {
          lizard = {
            ...lizard,
            damagePoints: 0,
            koLockedUntil: computeKoLockUntil(ts),
            pose: 'fall',
          }
        }
      }

      let activePunchSequence: PunchSequence | null = seq

      if (seq.impactResolved && ts >= seq.endTs) {
        changed = true
        if (seq.attacker === 'satoshi') {
          satoshi = {
            ...satoshi,
            lastPunchUsedAt: { ...satoshi.lastPunchUsedAt, [seq.punchType]: seq.endTs },
          }
        } else {
          lizard = {
            ...lizard,
            lastPunchUsedAt: { ...lizard.lastPunchUsedAt, [seq.punchType]: seq.endTs },
          }
        }
        activePunchSequence = null
        lastAttack = null
      }

      if (!changed) return {}

      return { satoshi, lizard, lastAttack, activePunchSequence, satoshiKoCount, lizardKoCount }
    })
  },

  applyMarketTick: (market, ts = Date.now()) => {
    const current = get()
    const opponentLizardKoUntil = current.lizard.koLockedUntil
    const opponentSatoshiKoUntil = current.satoshi.koLockedUntil
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
      pickDefenseType(sellPercents.leftPercent, sellPercents.rightPercent),
      ts,
    )

    let lastAttack: AttackEvent | null = current.lastAttack
    let activePunchSequence = current.activePunchSequence

    if (activePunchSequence === null) {
      const satoshiLeftPunch = nextAttackIfAvailable(satoshi, ts, buyPercents.leftPercent)
      const satoshiRightPunch = nextAttackIfAvailable(satoshi, ts, buyPercents.rightPercent)
      const satoshiChosen = selectDualHandPunch(satoshiLeftPunch, satoshiRightPunch, PUNCH_PRIORITY_HAND)
      if (satoshi.mode === 'offense' && satoshiChosen && ts >= opponentLizardKoUntil) {
        const { hand: satoshiHand, punchType: satoshiPunch } = satoshiChosen
        const impactAt = computePunchImpactAt(ts, 'satoshi', satoshiHand, satoshiPunch)
        const endTs = computePunchSequenceEndAt(ts, 'satoshi', satoshiHand, satoshiPunch)
        activePunchSequence = {
          attacker: 'satoshi',
          hand: satoshiHand,
          punchType: satoshiPunch,
          startTs: ts,
          impactAt,
          endTs,
          impactResolved: false,
        }
        satoshi = { ...satoshi, pose: 'attacking' }
        lastAttack = {
          attacker: 'satoshi',
          hand: satoshiHand,
          punchType: satoshiPunch,
          landed: false,
          ts,
          startedTs: ts,
        }
      } else {
        const lizardLeftPunch = nextAttackIfAvailable(lizard, ts, sellPercents.leftPercent)
        const lizardRightPunch = nextAttackIfAvailable(lizard, ts, sellPercents.rightPercent)
        const lizardChosen = selectDualHandPunch(lizardLeftPunch, lizardRightPunch, PUNCH_PRIORITY_HAND)
        if (lizard.mode === 'offense' && lizardChosen && ts >= opponentSatoshiKoUntil) {
          const { hand: lizardHand, punchType: lizardPunch } = lizardChosen
          const impactAt = computePunchImpactAt(ts, 'lizard', lizardHand, lizardPunch)
          const endTs = computePunchSequenceEndAt(ts, 'lizard', lizardHand, lizardPunch)
          activePunchSequence = {
            attacker: 'lizard',
            hand: lizardHand,
            punchType: lizardPunch,
            startTs: ts,
            impactAt,
            endTs,
            impactResolved: false,
          }
          lizard = { ...lizard, pose: 'attacking' }
          lastAttack = {
            attacker: 'lizard',
            hand: lizardHand,
            punchType: lizardPunch,
            landed: false,
            ts,
            startedTs: ts,
          }
        }
      }
    }

    set({ satoshi, lizard, lastAttack, activePunchSequence })
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
