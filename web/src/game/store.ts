import { create } from 'zustand'
import { MAX_DAMAGE_POINTS } from '../config/constants'
import {
  applyDamage,
  computeKoLockUntil,
  createEmptyLastPunchUsedAt,
  defenseBlocksPunch,
  gateDefenseAfterLeavingDefense,
  getHandPercents,
  nextAttackIfAvailable,
  pickDefenseType,
  resolveDefenseTypeWithCooldown,
  deriveLizardRingMode,
  deriveSatoshiRingMode,
  selectDualHandPunch,
} from './mechanics'
import { computePunchImpactAt, computePunchSequenceEndAt } from './punchFrames'
import { damageAnimationDurationMs, DAMAGE_COMPLETION_SAFETY_TIMEOUT_MS } from './damageSprites'
import { ANIMATION_FRAME_DELAY_MS, PUNCH_PRIORITY_HAND } from '../ui/androidMirrorConstants'
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

const DEFENSE_COMPLETION_MS = Math.max(3 * ANIMATION_FRAME_DELAY_MS, 3 * ANIMATION_FRAME_DELAY_MS)

const createFighter = (name: FighterState['name']): FighterState => ({
  name,
  mode: 'defense',
  defenseType: 'none',
  pose: 'idle',
  damagePoints: 0,
  koLockedUntil: 0,
  lastPunchUsedAt: createEmptyLastPunchUsedAt(),
  damageAnim: null,
  defenseStripStartTs: null,
  defenseCommittedAt: 0,
  defenseReenterNotBefore: 0,
  pendingDamageAfterDefense: null,
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

const defenderBusy = (f: FighterState): boolean =>
  f.damageAnim !== null || f.pendingDamageAfterDefense !== null

const clearDamageAnimIfDone = (f: FighterState, ts: number): FighterState => {
  if (!f.damageAnim) return f
  const dur = damageAnimationDurationMs(f.name, f.damageAnim.punchType, f.damageAnim.hand)
  const end = f.damageAnim.startTs + dur
  if (ts >= end || ts >= f.damageAnim.startTs + DAMAGE_COMPLETION_SAFETY_TIMEOUT_MS) {
    return { ...f, damageAnim: null }
  }
  return f
}

const stepFighterFromMarket = (
  prev: FighterState,
  mode: FighterState['mode'],
  rawDefenseFromPercents: FighterState['defenseType'],
  ts: number,
): FighterState => {
  const { defense: gated, reenterNotBefore } = gateDefenseAfterLeavingDefense(
    mode,
    rawDefenseFromPercents,
    prev.mode,
    ts,
    prev.defenseReenterNotBefore,
  )
  const effective = resolveDefenseTypeWithCooldown(gated, prev.defenseType, prev.defenseCommittedAt, ts)
  const defenseCommittedAt = effective === prev.defenseType ? prev.defenseCommittedAt : ts

  let defenseStripStartTs = prev.defenseStripStartTs
  if (mode === 'defense' && effective !== 'none') {
    if (prev.mode !== 'defense' || prev.defenseType !== effective || prev.defenseStripStartTs === null) {
      defenseStripStartTs = ts
    }
  } else {
    defenseStripStartTs = null
  }

  return {
    ...prev,
    mode,
    defenseType: effective,
    defenseCommittedAt,
    defenseReenterNotBefore: reenterNotBefore,
    defenseStripStartTs,
    pose: nextPose({ ...prev, mode }, ts),
  }
}

const applyKoFromDamage = (
  fighter: FighterState,
  ts: number,
  damageAfter: number,
): { fighter: FighterState; scoredKo: 'satoshi' | 'lizard' | null } => {
  if (damageAfter < MAX_DAMAGE_POINTS) {
    return { fighter: { ...fighter, damagePoints: damageAfter }, scoredKo: null }
  }
  const koFighter: FighterState = {
    ...fighter,
    damagePoints: 0,
    koLockedUntil: computeKoLockUntil(ts),
    pose: 'fall',
    damageAnim: null,
    pendingDamageAfterDefense: null,
  }
  return {
    fighter: koFighter,
    scoredKo: fighter.name === 'lizard' ? 'satoshi' : 'lizard',
  }
}

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
      let satoshi = clearDamageAnimIfDone(state.satoshi, ts)
      let lizard = clearDamageAnimIfDone(state.lizard, ts)
      let satoshiKoCount = state.satoshiKoCount
      let lizardKoCount = state.lizardKoCount
      let changed = false

      const applyPending = (def: FighterState): FighterState => {
        const p = def.pendingDamageAfterDefense
        if (!p || ts < p.applyAt) return def
        changed = true
        const without = { ...def, pendingDamageAfterDefense: null }
        const nextPts = applyDamage(without.damagePoints, p.punchType)
        const { fighter: after, scoredKo } = applyKoFromDamage(without, ts, nextPts)
        if (scoredKo === 'satoshi') satoshiKoCount += 1
        if (scoredKo === 'lizard') lizardKoCount += 1
        if (scoredKo) {
          return after
        }
        return {
          ...after,
          damageAnim: { hand: p.hand, punchType: p.punchType, startTs: ts },
        }
      }

      satoshi = applyPending(satoshi)
      lizard = applyPending(lizard)

      const seq0 = state.activePunchSequence
      if (!seq0) {
        if (changed) return { satoshi, lizard, satoshiKoCount, lizardKoCount }
        return {}
      }

      let seq = seq0
      let lastAttack = state.lastAttack

      if (!seq.impactResolved && ts >= seq.impactAt) {
        changed = true
        const defenderName: 'lizard' | 'satoshi' = seq.attacker === 'satoshi' ? 'lizard' : 'satoshi'
        let defender = defenderName === 'lizard' ? lizard : satoshi

        const blocks = defenseBlocksPunch(defender.defenseType, seq.punchType, seq.hand)
        const wrongBlock =
          defender.mode === 'defense' && defender.defenseType !== 'none' && !blocks

        let landed = false
        if (blocks) {
          landed = false
          defender = { ...defender }
        } else if (wrongBlock) {
          landed = false
          const stripStart = defender.defenseStripStartTs ?? ts
          defender = {
            ...defender,
            pendingDamageAfterDefense: {
              hand: seq.hand,
              punchType: seq.punchType,
              applyAt: Math.max(ts, stripStart) + DEFENSE_COMPLETION_MS,
            },
          }
        } else {
          landed = true
          const nextPts = applyDamage(defender.damagePoints, seq.punchType)
          const { fighter: after, scoredKo } = applyKoFromDamage(defender, ts, nextPts)
          defender = after
          if (scoredKo === 'satoshi') satoshiKoCount += 1
          if (scoredKo === 'lizard') lizardKoCount += 1
          if (!scoredKo) {
            defender = {
              ...defender,
              damageAnim: { hand: seq.hand, punchType: seq.punchType, startTs: ts },
            }
          }
        }

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

    let satoshi = clearDamageAnimIfDone(current.satoshi, ts)
    let lizard = clearDamageAnimIfDone(current.lizard, ts)
    let satoshiKoCount = current.satoshiKoCount
    let lizardKoCount = current.lizardKoCount

    const applyPendingOpen = (def: FighterState): FighterState => {
      const p = def.pendingDamageAfterDefense
      if (!p || ts < p.applyAt) return def
      const without = { ...def, pendingDamageAfterDefense: null }
      const nextPts = applyDamage(without.damagePoints, p.punchType)
      const { fighter: after, scoredKo } = applyKoFromDamage(without, ts, nextPts)
      if (scoredKo === 'satoshi') satoshiKoCount += 1
      if (scoredKo === 'lizard') lizardKoCount += 1
      if (scoredKo) return after
      return {
        ...after,
        damageAnim: { hand: p.hand, punchType: p.punchType, startTs: ts },
      }
    }

    satoshi = applyPendingOpen(satoshi)
    lizard = applyPendingOpen(lizard)

    satoshi = stepFighterFromMarket(
      satoshi,
      deriveSatoshiRingMode(market),
      pickDefenseType(buyPercents.leftPercent ?? 0, buyPercents.rightPercent ?? 0),
      ts,
    )

    lizard = stepFighterFromMarket(
      lizard,
      deriveLizardRingMode(market),
      pickDefenseType(sellPercents.leftPercent ?? 0, sellPercents.rightPercent ?? 0),
      ts,
    )

    let lastAttack: AttackEvent | null = current.lastAttack
    let activePunchSequence = current.activePunchSequence

    if (activePunchSequence === null) {
      const satoshiLeftPunch = nextAttackIfAvailable(satoshi, ts, buyPercents.leftPercent)
      const satoshiRightPunch = nextAttackIfAvailable(satoshi, ts, buyPercents.rightPercent)
      const satoshiChosen = selectDualHandPunch(satoshiLeftPunch, satoshiRightPunch, PUNCH_PRIORITY_HAND)
      if (
        satoshi.mode === 'offense' &&
        satoshiChosen &&
        ts >= opponentLizardKoUntil &&
        !defenderBusy(lizard)
      ) {
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
        if (
          lizard.mode === 'offense' &&
          lizardChosen &&
          ts >= opponentSatoshiKoUntil &&
          !defenderBusy(satoshi)
        ) {
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

    set({ satoshi, lizard, lastAttack, activePunchSequence, satoshiKoCount, lizardKoCount })
  },

  toggleCharacterAlignment: () => {
    set((state) => ({ alignCharacters: !state.alignCharacters }))
  },

  resetDamage: () => {
    set((state) => ({
      satoshi: {
        ...state.satoshi,
        damagePoints: 0,
        damageAnim: null,
        pendingDamageAfterDefense: null,
      },
      lizard: {
        ...state.lizard,
        damagePoints: 0,
        damageAnim: null,
        pendingDamageAfterDefense: null,
      },
    }))
  },
}))
