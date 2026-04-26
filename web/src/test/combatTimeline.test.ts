import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyLastPunchUsedAt } from '../game/mechanics'
import { useGameStore } from '../game/store'
import type { FighterState, PunchSequence } from '../game/types'

const fighter = (name: 'satoshi' | 'lizard', over: Partial<FighterState> = {}): FighterState => ({
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
  ...over,
})

describe('combat timeline (impact + cooldown)', () => {
  beforeEach(() => {
    useGameStore.setState({
      satoshi: fighter('satoshi'),
      lizard: fighter('lizard'),
      lastAttack: null,
      activePunchSequence: null,
      alignCharacters: false,
      satoshiKoCount: 0,
      lizardKoCount: 0,
    })
  })

  it('resolves landed vs defense at impact time, not wind-up', () => {
    const seq: PunchSequence = {
      attacker: 'satoshi',
      hand: 'left',
      punchType: 'uppercut',
      startTs: 0,
      impactAt: 160,
      endTs: 320,
      impactResolved: false,
    }
    useGameStore.setState({
      satoshi: fighter('satoshi', { mode: 'offense', pose: 'attacking' }),
      lizard: fighter('lizard', { defenseType: 'none' }),
      activePunchSequence: seq,
      lastAttack: {
        attacker: 'satoshi',
        hand: 'left',
        punchType: 'uppercut',
        landed: false,
        ts: 0,
        startedTs: 0,
      },
    })

    useGameStore.getState().advanceCombat(150)
    expect(useGameStore.getState().lizard.damagePoints).toBe(0)

    useGameStore.setState({
      lizard: fighter('lizard', { defenseType: 'headBlock' }),
    })
    useGameStore.getState().advanceCombat(160)
    const s = useGameStore.getState()
    expect(s.lastAttack?.landed).toBe(false)
    expect(s.lizard.damagePoints).toBe(0)

    useGameStore.getState().advanceCombat(320)
    expect(useGameStore.getState().activePunchSequence).toBeNull()
    expect(useGameStore.getState().satoshi.lastPunchUsedAt.uppercut).toBe(320)
  })

  it('applies damage when defender still open at impact', () => {
    const seq: PunchSequence = {
      attacker: 'satoshi',
      hand: 'left',
      punchType: 'jab',
      startTs: 0,
      impactAt: 80,
      endTs: 240,
      impactResolved: false,
    }
    useGameStore.setState({
      satoshi: fighter('satoshi', { mode: 'offense', pose: 'attacking' }),
      lizard: fighter('lizard', { defenseType: 'none' }),
      activePunchSequence: seq,
      lastAttack: {
        attacker: 'satoshi',
        hand: 'left',
        punchType: 'jab',
        landed: false,
        ts: 0,
        startedTs: 0,
      },
    })
    useGameStore.getState().advanceCombat(80)
    const s = useGameStore.getState()
    expect(s.lastAttack?.landed).toBe(true)
    expect(s.lizard.damagePoints).toBe(1)
    expect(s.lizard.damageAnim).toEqual({ hand: 'left', punchType: 'jab', startTs: 80 })
  })

  it('defers damage on wrong block until defense window completes', () => {
    const seq: PunchSequence = {
      attacker: 'satoshi',
      hand: 'left',
      punchType: 'jab',
      startTs: 0,
      impactAt: 80,
      endTs: 240,
      impactResolved: false,
    }
    useGameStore.setState({
      satoshi: fighter('satoshi', { mode: 'offense', pose: 'attacking' }),
      lizard: fighter('lizard', {
        mode: 'defense',
        pose: 'defending',
        defenseType: 'bodyBlock',
        defenseStripStartTs: 0,
      }),
      activePunchSequence: seq,
      lastAttack: {
        attacker: 'satoshi',
        hand: 'left',
        punchType: 'jab',
        landed: false,
        ts: 0,
        startedTs: 0,
      },
    })
    useGameStore.getState().advanceCombat(80)
    const mid = useGameStore.getState()
    expect(mid.lastAttack?.landed).toBe(false)
    expect(mid.lizard.damagePoints).toBe(0)
    expect(mid.lizard.pendingDamageAfterDefense).toEqual({
      hand: 'left',
      punchType: 'jab',
      applyAt: 320,
    })

    useGameStore.getState().advanceCombat(319)
    expect(useGameStore.getState().lizard.damagePoints).toBe(0)

    useGameStore.getState().advanceCombat(320)
    const end = useGameStore.getState()
    expect(end.lizard.damagePoints).toBe(1)
    expect(end.lizard.pendingDamageAfterDefense).toBeNull()
    expect(end.lizard.damageAnim).toEqual({ hand: 'left', punchType: 'jab', startTs: 320 })
  })
})
