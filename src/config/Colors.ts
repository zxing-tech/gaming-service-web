/**

 *

 */

export const COLORS = {
  /**

   */
  game: {

    swipeTrail: 0xffffff,
  },

  /**

   */
  debug: {

    trajectory: 0x00aaff,

    swipeDebug: 0xffff00,

    targetMarker: 0xff0000,
  },

  /**

   */
  collider: {

    ball: 0x00ffc6,

    ballEdge: 0x00ffc6,


    goal: 0xff4400,

    goalEdge: 0xff5500,


    sensorFace: 0x00e0ff,

    sensorEdge: 0x00e0ff,


    net: 0x0096ff,

    netEdge: 0x33bbff,


    adBoard: 0xffaa33,

    adBoardEdge: 0xffaa33,
  },

  /**

   */
  axisArrows: {

    x: 0xff5555,

    y: 0x55ff55,

    z: 0x5599ff,
  },
} as const;
