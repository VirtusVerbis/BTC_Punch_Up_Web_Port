import {
  BG2_CHART_HEIGHT_FRACTION,
  BG2_CHART_TOP_OFFSET_FRACTION,
  LIZARD_SCALE,
  LIZARD_X_POSITION,
  LIZARD_Y_POSITION,
  SATOSHI_SCALE,
  SATOSHI_X_POSITION,
  SATOSHI_Y_POSITION,
} from './androidMirrorConstants'

/**
 * Layout anchors for the 1080×1920 reference frame (same as `REFERENCE_*` in constants).
 * Values are fractions 0–1 for top/left/width/height inside `.scene`.
 *
 * z-index (Android parity, all &lt; overlay z-20):
 * - 0: `.scene-hud-bg` (CSS)
 * - 2: bg5 audience
 * - 3–5: reserved for future bg4 signs / bg3 flash / bg2 memes
 * - 6: bg1 chart band
 * - 7: bg0 ring (closest background)
 * - 8: fg1 Lizard (behind Satoshi)
 * - 9: fg2 Satoshi
 * - 10: reserved fg3 (e.g. cat)
 */
export const mobileAssetManifest = {
  /** Reserved for PNG-backed HUD; Android uses Compose text/bars instead. */
  hudBackground: null as string | null,

  audience: {
    zIndex: 2,
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    objectFit: 'cover' as const,
  },

  chartBand: {
    zIndex: 6,
    left: 0.04,
    width: 0.92,
    top: BG2_CHART_TOP_OFFSET_FRACTION,
    height: BG2_CHART_HEIGHT_FRACTION,
  },

  ring: {
    zIndex: 7,
    left: 0.01,
    /** Shifted up by ~30% per latest calibration request. */
    top: 0.27,
    width: 0.98,
    /** Extend to bottom edge: 0.27 top + 0.73 height = 1.00 */
    height: 0.73,
    objectFit: 'cover' as const,
  },

  lizard: {
    zIndex: 8,
    anchorX: LIZARD_X_POSITION,
    anchorY: LIZARD_Y_POSITION,
    alignDeltaX: 0.08,
    scale: LIZARD_SCALE,
  },

  satoshi: {
    zIndex: 9,
    anchorX: SATOSHI_X_POSITION,
    anchorY: SATOSHI_Y_POSITION,
    alignDeltaX: 0.08,
    scale: SATOSHI_SCALE,
  },
}
