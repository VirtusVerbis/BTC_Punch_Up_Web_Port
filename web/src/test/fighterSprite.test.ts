import { describe, expect, it } from 'vitest'
import { audienceFile, pickFighterSpriteFile, ringFile } from '../ui/fighterSprite'

describe('fighterSprite', () => {
  it('picks idle Satoshi frame', () => {
    const f = pickFighterSpriteFile('satoshi', 'idle', 'offense', 'none', null, 0)
    expect(f).toMatch(/^satoshi_ready_\d\.png$/)
  })

  it('resolves audience and ring assets', () => {
    expect(audienceFile(3, 1)).toBe('audience_1_r3.png')
    expect(ringFile(0)).toBe('ring_0.png')
  })
})
