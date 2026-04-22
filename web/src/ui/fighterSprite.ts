import type { AttackEvent, DefenseType, FighterName, FighterPose, FighterState, Hand, PunchType } from '../game/types'
import { ANIMATION_FRAME_DELAY_MS } from './androidMirrorConstants'
import { resolveMobileAssetUrl } from './mobileAssetUrls'

const tick = (nowMs: number) => Math.floor(nowMs / ANIMATION_FRAME_DELAY_MS)

const cycle = (nowMs: number, len: number) => (tick(nowMs) % len + len) % len

const punchFrameCount = (fighter: FighterName, hand: Hand, punch: PunchType): number => {
  const uppercuts = 4
  const hooksLizardLeft = 4
  const hooksLizardRight = 4
  if (punch === 'uppercut') return uppercuts
  if (punch === 'hook' && fighter === 'lizard') return hand === 'left' ? hooksLizardLeft : hooksLizardRight
  return 3
}

const punchBase = (fighter: FighterName, hand: Hand, punch: PunchType): string => {
  return `${fighter}_${hand}_${punch}`
}

const punchFile = (fighter: FighterName, hand: Hand, punch: PunchType, frame: number): string => {
  const n = punchFrameCount(fighter, hand, punch)
  const f = Math.min(n - 1, Math.max(0, frame))
  return `${punchBase(fighter, hand, punch)}_${f}.png`
}

const defenseBase = (fighter: FighterName, defense: DefenseType): string | null => {
  if (defense === 'none') return null
  if (defense === 'headBlock') return `${fighter}_block_head`
  if (defense === 'bodyBlock') return `${fighter}_block_body`
  if (defense === 'dodgeLeft') return `${fighter}_left_dodge`
  if (defense === 'dodgeRight') return `${fighter}_right_dodge`
  return null
}

const defenseFile = (fighter: FighterName, defense: DefenseType, nowMs: number): string => {
  const base = defenseBase(fighter, defense)
  if (!base) return idleFile(fighter, nowMs)
  const frame = cycle(nowMs, 3)
  return `${base}_${frame}.png`
}

const idleFile = (fighter: FighterName, nowMs: number): string => {
  if (fighter === 'satoshi') {
    const i = cycle(nowMs, 6)
    return `satoshi_ready_${i}.png`
  }
  const i = cycle(nowMs, 6)
  return `lizard_idle_${i}.png`
}

const koFile = (fighter: FighterName, pose: FighterPose): string => {
  if (fighter === 'satoshi') {
    if (pose === 'fall') return 'satoshi_falling_0.png'
    if (pose === 'knockedDown') return 'satoshi_knocked_down_0.png'
    return 'satoshi_rising_0.png'
  }
  if (pose === 'fall') return 'lizard_falling_0.png'
  if (pose === 'knockedDown') return 'lizard_knocked_down_0.png'
  return 'lizard_rising_0.png'
}

/**
 * True when `pickFighterSpriteFile` would use the idle loop (no KO, punch mid-frame, or block/dodge frames).
 * Bobbing and depth scaling pause unless both fighters satisfy this at once.
 */
export const fighterSpriteIdleForBobbing = (
  fighter: FighterName,
  pose: FighterPose,
  mode: FighterState['mode'],
  defenseType: DefenseType,
  lastAttack: AttackEvent | null,
): boolean => {
  if (pose === 'fall' || pose === 'knockedDown' || pose === 'rise') return false
  if (pose === 'attacking' && lastAttack?.attacker === fighter) return false
  if (pose === 'defending' || mode === 'defense') {
    return defenseType === 'none'
  }
  return true
}

export const bothFightersIdleForBobbing = (
  satoshi: FighterState,
  lizard: FighterState,
  lastAttack: AttackEvent | null,
): boolean =>
  fighterSpriteIdleForBobbing('satoshi', satoshi.pose, satoshi.mode, satoshi.defenseType, lastAttack) &&
  fighterSpriteIdleForBobbing('lizard', lizard.pose, lizard.mode, lizard.defenseType, lastAttack)

export const pickFighterSpriteFile = (
  fighter: FighterName,
  pose: FighterPose,
  mode: 'offense' | 'defense',
  defenseType: DefenseType,
  lastAttack: AttackEvent | null,
  nowMs: number,
): string => {
  if (pose === 'fall' || pose === 'knockedDown' || pose === 'rise') {
    return koFile(fighter, pose)
  }

  if (pose === 'attacking' && lastAttack?.attacker === fighter) {
    const mid = Math.floor(punchFrameCount(fighter, lastAttack.hand, lastAttack.punchType) / 2)
    return punchFile(fighter, lastAttack.hand, lastAttack.punchType, mid)
  }

  if (pose === 'defending' || mode === 'defense') {
    if (defenseType === 'none') return idleFile(fighter, nowMs)
    return defenseFile(fighter, defenseType, nowMs)
  }

  return idleFile(fighter, nowMs)
}

export const fighterSpriteUrl = (
  fighter: FighterName,
  pose: FighterPose,
  mode: 'offense' | 'defense',
  defenseType: DefenseType,
  lastAttack: AttackEvent | null,
  nowMs: number,
): string => resolveMobileAssetUrl(pickFighterSpriteFile(fighter, pose, mode, defenseType, lastAttack, nowMs))

export const audienceFile = (ringIndex: number, subFrame: number): string =>
  `audience_${subFrame}_r${ringIndex}.png`

export const ringFile = (ringIndex: number): string => `ring_${ringIndex}.png`
