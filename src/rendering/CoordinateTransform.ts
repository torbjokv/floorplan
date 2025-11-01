import type { ResolvedRoom, Anchor } from '../types';

const CORNER_GRAB_RADIUS = 600; // mm - distance from corner to detect hover/grab

/**
 * Utilities for coordinate transformations and spatial calculations
 */
export class CoordinateTransform {
  /**
   * Convert SVG screen coordinates to millimeter coordinates
   */
  static screenToMM(
    svgRef: SVGSVGElement | null,
    screenX: number,
    screenY: number
  ): { x: number; y: number } {
    if (!svgRef) return { x: 0, y: 0 };

    const pt = svgRef.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    const svgPt = pt.matrixTransform(svgRef.getScreenCTM()?.inverse());

    // Convert from screen units back to mm
    // mm() function does: val * DISPLAY_SCALE / 10 (where DISPLAY_SCALE = 1)
    // So to reverse: screen_val * 10
    return {
      x: svgPt.x * 10,
      y: svgPt.y * 10,
    };
  }

  /**
   * Get corner position of a room
   */
  static getCornerPosition(room: ResolvedRoom, corner: Anchor): { x: number; y: number } {
    switch (corner) {
      case 'top-left':
        return { x: room.x, y: room.y };
      case 'top-right':
        return { x: room.x + room.width, y: room.y };
      case 'bottom-left':
        return { x: room.x, y: room.y + room.depth };
      case 'bottom-right':
        return { x: room.x + room.width, y: room.y + room.depth };
    }
  }

  /**
   * Find which corner of a room is closest to a point
   * Returns null if no corner is within grab radius
   */
  static findClosestCorner(
    room: ResolvedRoom,
    x: number,
    y: number
  ): { corner: Anchor; distance: number } | null {
    const corners: { corner: Anchor; x: number; y: number }[] = [
      { corner: 'top-left', x: room.x, y: room.y },
      { corner: 'top-right', x: room.x + room.width, y: room.y },
      { corner: 'bottom-left', x: room.x, y: room.y + room.depth },
      { corner: 'bottom-right', x: room.x + room.width, y: room.y + room.depth },
    ];

    let closest = null;
    let minDist = CORNER_GRAB_RADIUS;

    for (const c of corners) {
      const dist = Math.sqrt(Math.pow(c.x - x, 2) + Math.pow(c.y - y, 2));
      if (dist < minDist) {
        minDist = dist;
        closest = { corner: c.corner, distance: dist };
      }
    }

    return closest;
  }

  /**
   * Check if point is inside room center (not near corners)
   */
  static isInsideRoomCenter(room: ResolvedRoom, x: number, y: number): boolean {
    if (x < room.x || x > room.x + room.width || y < room.y || y > room.y + room.depth) {
      return false;
    }
    // Make sure not near any corner
    const closest = this.findClosestCorner(room, x, y);
    return !closest;
  }

  /**
   * Check if point is inside room bounds (including parts)
   */
  static isPointInRoom(
    room: ResolvedRoom,
    x: number,
    y: number,
    parts: Array<{ x: number; y: number; width: number; depth: number }>
  ): boolean {
    // Check main room
    if (x >= room.x && x <= room.x + room.width && y >= room.y && y <= room.y + room.depth) {
      return true;
    }

    // Check parts
    for (const part of parts) {
      if (x >= part.x && x <= part.x + part.width && y >= part.y && y <= part.y + part.depth) {
        return true;
      }
    }

    return false;
  }
}
