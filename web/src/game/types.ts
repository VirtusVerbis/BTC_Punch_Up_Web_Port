export type ExchangeName = 'binance' | 'coinbase'
export type Hand = 'left' | 'right'
export type FighterName = 'satoshi' | 'lizard'
export type Mode = 'offense' | 'defense'

export type PunchType = 'jab' | 'body' | 'hook' | 'cross' | 'uppercut'
export type DefenseType = 'headBlock' | 'bodyBlock' | 'dodgeLeft' | 'dodgeRight' | 'none'

export type FighterPose = 'idle' | 'attacking' | 'defending' | 'fall' | 'knockedDown' | 'rise'

export interface ExchangeSnapshot {
  exchange: ExchangeName
  price: number
  buyVolume: number
  sellVolume: number
  updatedAt: number
}

export interface MarketSnapshot {
  binance: ExchangeSnapshot
  coinbase: ExchangeSnapshot
}

export interface AttackEvent {
  attacker: FighterName
  hand: Hand
  punchType: PunchType
  landed: boolean
  /** Impact / resolution time (when `landed` is authoritative). */
  ts: number
  /** When the punch animation started (wind-up); used for sprite frame progression. */
  startedTs?: number
}

/** One in-flight punch timeline (global); mirrors Android pending-impact style sequencing. */
export interface PunchSequence {
  attacker: FighterName
  hand: Hand
  punchType: PunchType
  startTs: number
  impactAt: number
  endTs: number
  impactResolved: boolean
}

export interface FighterState {
  name: FighterName
  mode: Mode
  defenseType: DefenseType
  pose: FighterPose
  damagePoints: number
  koLockedUntil: number
  /** Last time each punch type completed its full sequence (`endTs`), for per-type cooldowns. */
  lastPunchUsedAt: Record<PunchType, number>
}
