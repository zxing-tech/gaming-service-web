/**

 */

export const DEBUG_CONFIG = {
  /**

   */
  trajectory: {

    sampleStep: 0.05,

    sampleCount: 60,

    lineWidth: 0.045,

    opacity: 0.95,
  },

  /**

   */
  swipeDebug: {

    lineWidth: 0.06,

    opacity: 0.7,
  },

  /** Player-visible swipe ribbon (thick white trail from ball). */
  swipeTrail: {

    lineWidth: 0.09,

    opacity: 0.98,

    catmullMinDivisions: 28,

    catmullMaxDivisions: 96,

    /**
     * Screen speed (px/ms) past which the ribbon uses a raw polyline — matches a quick flick
     * so the line doesn’t feel “laggy” behind the finger.
     */
    fastSwipePxPerMs: 0.32,

    /**
     * With many samples (coalesced fast moves), skip extra spline smoothing.
     */
    rawPolylineMinControlPoints: 16,
  },

  /**

   */
  targetMarker: {

    radius: 0.11,

    segments: 16,

    opacity: 0.5,
  },

  /**

   */
  ballCollider: {

    opacity: 0.45,
  },

  /**

   */
  goalCollider: {

    opacity: 0.55,
  },

  /**

   */
  sensorFace: {

    opacity: 0.2,
  },

  /**

   */
  netCollider: {

    opacity: 0.28,
  },

  /**

   */
  adBoardCollider: {

    opacity: 0.12,
  },

  /**

   */
  axisArrows: {

    length: 0.7,

    headLength: 0.2,

    headWidth: 0.1,
  },

  /**

   */
  swipePointMarker: {

    scale: 0.15,

    renderOrder: 1000,

    labelColor: '#000000',

    labelFontSize: '18px',
  },

  /**

   */
  renderOrder: {

    swipeDebugLine: 999,
  },
} as const;
