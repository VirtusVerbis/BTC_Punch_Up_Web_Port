import { REFERENCE_ASPECT_RATIO } from '../config/constants'

interface StageProps {
  children: React.ReactNode
}

export const Stage = ({ children }: StageProps) => (
  <div className="stage-shell">
    <div
      className="stage"
      style={{
        aspectRatio: String(REFERENCE_ASPECT_RATIO),
      }}
    >
      {children}
    </div>
  </div>
)
