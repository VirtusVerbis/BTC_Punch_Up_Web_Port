import type { FighterState } from '../game/types'

interface FightSceneProps {
  satoshi: FighterState
  lizard: FighterState
  alignCharacters: boolean
  showCandleChart: boolean
}

const fighterClass = (name: string, pose: string, aligned: boolean): string =>
  ['fighter', name, pose, aligned ? 'aligned' : ''].filter(Boolean).join(' ')

export const FightScene = ({
  satoshi,
  lizard,
  alignCharacters,
  showCandleChart,
}: FightSceneProps) => (
  <div className="scene">
    <div className="splash">BTC Punch Up</div>
    <div className="audience-layer" />
    <div className="ring-layer" />
    {showCandleChart ? <div className="chart-panel">Candle Chart (optional)</div> : null}
    <div className={fighterClass('satoshi', satoshi.pose, alignCharacters)}>
      <span>Satoshi</span>
      <small>{satoshi.mode} / {satoshi.defenseType}</small>
    </div>
    <div className={fighterClass('lizard', lizard.pose, alignCharacters)}>
      <span>Lizard</span>
      <small>{lizard.mode} / {lizard.defenseType}</small>
    </div>
  </div>
)
