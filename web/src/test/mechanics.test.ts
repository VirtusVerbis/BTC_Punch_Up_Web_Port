import {
  applyDamage,
  defenseBlocksPunch,
  pickDefenseType,
  pickPunchType,
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
})
