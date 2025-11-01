import type { Anchor, Point, ResolvedRoom } from '../types';

/**
 * Calculates positions and anchor adjustments for rooms and parts
 * Encapsulates all coordinate transformation logic
 */
export class PositionCalculator {
  /**
   * Get the corner position of a room or part
   */
  static getCorner(room: ResolvedRoom, corner: Anchor): Point {
    const x = room.x;
    const y = room.y;
    switch (corner) {
      case 'top-left':
        return { x, y };
      case 'top-right':
        return { x: x + room.width, y };
      case 'bottom-left':
        return { x, y: y + room.depth };
      case 'bottom-right':
        return { x: x + room.width, y: y + room.depth };
      default:
        return { x, y };
    }
  }

  /**
   * Calculate anchor adjustment offset
   * This adjusts the position based on which corner of the room is being anchored
   */
  static getAnchorAdjustment(anchor: Anchor, width: number, depth: number): Point {
    switch (anchor) {
      case 'top-left':
        return { x: 0, y: 0 };
      case 'top-right':
        return { x: -width, y: 0 };
      case 'bottom-left':
        return { x: 0, y: -depth };
      case 'bottom-right':
        return { x: -width, y: -depth };
      default:
        return { x: 0, y: 0 };
    }
  }

  /**
   * Calculate absolute position given anchor point, offset, and dimensions
   */
  static calculatePosition(
    anchorPoint: Point,
    anchor: Anchor,
    width: number,
    depth: number,
    offset: [number, number] = [0, 0]
  ): Point {
    const anchorAdjust = this.getAnchorAdjustment(anchor, width, depth);
    return {
      x: anchorPoint.x + offset[0] + anchorAdjust.x,
      y: anchorPoint.y + offset[1] + anchorAdjust.y,
    };
  }
}
