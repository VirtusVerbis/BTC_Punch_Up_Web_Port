/** Timings and tuning mirrored from Android `MainActivity.kt` (VirtusVerbis/BTC_Punch_Up). */

export const SPLASH_DISPLAY_MS = 2500
export const SPLASH_FADE_OUT_MS = 300
export const TITLE_DISPLAY_MS = 3500
export const TITLE_FADE_OUT_MS = 300

export const ANIMATION_FRAME_DELAY_MS = 80

export const AUDIENCE_FRAME_DELAY_MS = 4000

export const RING_ROTATE_FREQUENCY_MS = 2 * 60 * 1000
export const RING_ROTATION_FRAME_DELAY_MS = 8000

export const BG2_SHOW_INTERVAL_MS = 3 * 60 * 1000
export const BG2_VISIBLE_DURATION_MS = 30_000
export const BG2_CHART_TOP_OFFSET_FRACTION = 0.15
/** Target: chart bottom aligns around screen midpoint (0.15 + 0.35 = 0.50). */
export const BG2_CHART_HEIGHT_FRACTION = 0.35

/** Android `Sprite`: boxers use 128dp art × `sizeScale` (see `Sprite` composable `baseSizeDp`). */
export const FIGHTER_BASE_ART_DP = 128

/**
 * Web-only: Compose also clips/scales the full game; raw 128×scale px can dominate the ring on web.
 * Applied as an extra multiplier in `fighterStyle` (see FightScene).
 */
export const FIGHTER_WEB_DISPLAY_FACTOR = 1.35

/** Web-only: shift both boxer anchor centers (positive = down); fraction of scene height (see FightScene). */
export const FIGHTER_ANCHOR_Y_OFFSET_FRACTION = 0.05

/** Android `MainActivity` boxer bobbing (pixels on 1080×1920 reference; scaled in `useBoxerBobbing`). */
export const BOBBING_MAX_X_LEFT = -20
export const BOBBING_MAX_X_RIGHT = 20
export const BOBBING_MAX_Y_UP = -15
export const BOBBING_MAX_Y_DOWN = 15
export const BOBBING_STEP_PX = 1
export const BOBBING_INTERVAL_MS = 40
export const BOBBING_Y_STEPS_PER_FULL_X_CYCLE = 3
export const BOBBING_TOGETHER_MAX_X_LEFT = -200
export const BOBBING_TOGETHER_MAX_X_RIGHT = 200
export const BOBBING_TOGETHER_STEP_PX = 5
export const BOBBING_START_DELAY_MS = 150

/** Android depth scale percents (`SCALE_*` in MainActivity). */
export const SCALE_SMALLER_PERCENT_SATOSHI = 5
export const SCALE_LARGER_PERCENT_SATOSHI = 20
export const SCALE_SMALLER_PERCENT_LIZARD = 5
export const SCALE_LARGER_PERCENT_LIZARD = 20

/** Sprite placement (fractions of stage height/width), from Android constants. */
export const SATOSHI_Y_POSITION = 0.7
export const SATOSHI_X_POSITION = 0.5
export const LIZARD_Y_POSITION = 0.66
export const LIZARD_X_POSITION = 0.5

export const SATOSHI_SCALE = 4.5//3.5
export const LIZARD_SCALE = 5
