import type { FighterState } from '../game/types'
import {
  applyDamage,
  createEmptyLastPunchUsedAt,
  defenseBlocksPunch,
  nextAttackIfAvailable,
  pickDefenseType,
  pickPunchType,
  selectDualHandPunch,
} from '../game/mechanics'

describe('mechanics thresholds', () => {
  test('maps punch threshold bands correctly', () => {
    expect(pickPunchType(10)).toBe('jab')
    expect(pickPunchType(34)).toBe('body')
    expect(pickPunchType(50)).toBe('hook')
    expect(pickPunchType(79)).toBe('cross')
    expect(pickPunchType(95)).toBe('uppercut')
  })

  test('maps defense thresholds correctly', () => {
    expect(pickDefenseType(60, 30)).toBe('headBlock')
    expect(pickDefenseType(32, 20)).toBe('bodyBlock')
    expect(pickDefenseType(14, 0)).toBe('dodgeLeft')
    expect(pickDefenseType(0, 17)).toBe('dodgeRight')
  })

  test('defense rules match attack family', () => {
    expect(defenseBlocksPunch('headBlock', 'uppercut', 'left')).toBe(true)
    expect(defenseBlocksPunch('bodyBlock', 'hook', 'right')).toBe(true)
    expect(defenseBlocksPunch('dodgeRight', 'jab', 'left')).toBe(true)
    expect(defenseBlocksPunch('dodgeLeft', 'body', 'right')).toBe(true)
    expect(defenseBlocksPunch('bodyBlock', 'uppercut', 'left')).toBe(false)
  })

  test('damage accumulation uses expected points', () => {
    expect(applyDamage(0, 'jab')).toBe(1)
    expect(applyDamage(92, 'uppercut')).toBe(100)
  })

  test('selectDualHandPunch prefers priority hand when both ready', () => {
    expect(selectDualHandPunch('jab', 'hook', 'right')).toEqual({ hand: 'right', punchType: 'hook' })
    expect(selectDualHandPunch('jab', 'hook', 'left')).toEqual({ hand: 'left', punchType: 'jab' })
  })

  test('selectDualHandPunch returns single available hand', () => {
    expect(selectDualHandPunch('body', null, 'right')).toEqual({ hand: 'left', punchType: 'body' })
    expect(selectDualHandPunch(null, 'cross', 'right')).toEqual({ hand: 'right', punchType: 'cross' })
    expect(selectDualHandPunch(null, null, 'right')).toBeNull()
  })

  const fighterBase = (over: Partial<FighterState>): FighterState => ({
    name: 'satoshi',
    mode: 'offense',
    defenseType: 'none',
    pose: 'idle',
    damagePoints: 0,
    koLockedUntil: 0,
    lastPunchUsedAt: createEmptyLastPunchUsedAt(),
    ...over,
  })

  test('nextAttackIfAvailable uses per-punch cooldown from lastPunchUsedAt', () => {
    const f = fighterBase({
      lastPunchUsedAt: { ...createEmptyLastPunchUsedAt(), jab: 5000 },
    })
    expect(nextAttackIfAvailable(f, 5800, 10)).toBeNull()
    expect(nextAttackIfAvailable(f, 6000, 10)).toBe('jab')
  })
})
