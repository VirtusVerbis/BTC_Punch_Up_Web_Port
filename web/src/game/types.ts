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
  ts: number
}

export interface FighterState {
  name: FighterName
  mode: Mode
  defenseType: DefenseType
  pose: FighterPose
  damagePoints: number
  koLockedUntil: number
  lastAttackAt: number
}
