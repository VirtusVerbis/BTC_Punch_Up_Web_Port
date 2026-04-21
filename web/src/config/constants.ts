export const REFERENCE_WIDTH = 1080
export const REFERENCE_HEIGHT = 1920
export const REFERENCE_ASPECT_RATIO = REFERENCE_WIDTH / REFERENCE_HEIGHT

export const MAX_DAMAGE_POINTS = 100

export const PUNCH_THRESHOLDS = [
  { maxPercent: 20, type: 'jab' },
  { maxPercent: 40, type: 'body' },
  { maxPercent: 60, type: 'hook' },
  { maxPercent: 80, type: 'cross' },
  { maxPercent: 100, type: 'uppercut' },
] as const

export const PUNCH_COOLDOWNS_MS = {
  jab: 1000,
  body: 2000,
  hook: 3000,
  cross: 4000,
  uppercut: 5000,
} as const

export const PUNCH_DAMAGE = {
  jab: 1,
  body: 3,
  hook: 4,
  cross: 5,
  uppercut: 8,
} as const

export const KO_SEQUENCE_MS = {
  fall: 400,
  knockedDown: 5000,
  rise: 4600,
} as const

export const BLOCK_HEIGHT_POLL_MS = 60_000
export const STALE_TIMER_MS = 10 * 60 * 1000
export const STALE_FLASH_INTERVAL_MS = 30_000
export const BLOCK_CHANGE_FLASH_COUNT = 10
export const FLASH_HALF_CYCLE_MS = 40
