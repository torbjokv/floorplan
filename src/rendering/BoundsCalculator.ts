import type { ResolvedRoom, RoomObject } from '../types';
import { getCorner } from '../utils';

const BOUNDS_PADDING_PERCENTAGE = 0.1; // 10% padding on each side
const DEFAULT_OBJECT_SIZE = 1000; // mm

interface Bounds {
  x: number;
  y: number;
  width: number;
  depth: number;
}

/**
 * Helper function to calculate anchor offset for objects
 */
function getObjectAnchorOffset(
  anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  width: number,
  height: number
): { x: number; y: number } {
  switch (anchor) {
    case 'top-left':
      return { x: 0, y: 0 };
    case 'top-right':
      return { x: -width, y: 0 };
    case 'bottom-left':
      return { x: 0, y: -height };
    case 'bottom-right':
      return { x: -width, y: -height };
  }
}

/**
 * Calculates bounds for the entire floorplan including all rooms, parts, and objects
 */
export class BoundsCalculator {
  /**
   * Calculate bounds for all rooms including their parts and objects
   */
  static calculateBounds(
    roomMap: Record<string, ResolvedRoom>,
    compositeRoomPartsMap: Map<
      string,
      Array<{ x: number; y: number; width: number; depth: number }>
    >
  ): Bounds {
    if (Object.keys(roomMap).length === 0) {
      return { x: 0, y: 0, width: 10000, depth: 10000 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    Object.values(roomMap).forEach(room => {
      const parts = compositeRoomPartsMap.get(room.id) || [];

      // Check main room bounds
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.depth);

      // Check parts bounds
      parts.forEach(part => {
        minX = Math.min(minX, part.x);
        minY = Math.min(minY, part.y);
        maxX = Math.max(maxX, part.x + part.width);
        maxY = Math.max(maxY, part.y + part.depth);
      });

      // Check room objects bounds
      if (room.objects) {
        room.objects.forEach(obj => {
          const objBounds = this.calculateObjectBounds(room, obj);
          minX = Math.min(minX, objBounds.minX);
          minY = Math.min(minY, objBounds.minY);
          maxX = Math.max(maxX, objBounds.maxX);
          maxY = Math.max(maxY, objBounds.maxY);
        });
      }
    });

    // Add padding
    const width = maxX - minX;
    const depth = maxY - minY;
    const padding = Math.max(width, depth) * BOUNDS_PADDING_PERCENTAGE;

    return {
      x: minX - padding,
      y: minY - padding,
      width: width + padding * 2,
      depth: depth + padding * 2,
    };
  }

  /**
   * Calculate bounds for a single object
   */
  private static calculateObjectBounds(
    room: ResolvedRoom,
    obj: RoomObject
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    const anchor = obj.anchor || 'top-left';
    const roomCorner = getCorner(room, anchor);

    // Object position is: room corner + x,y offset
    const absX = roomCorner.x + obj.x;
    const absY = roomCorner.y + obj.y;

    if (obj.type === 'circle') {
      const diameter = obj.width || DEFAULT_OBJECT_SIZE;
      const radius = diameter / 2;
      const objOffset = getObjectAnchorOffset(anchor, diameter, diameter);
      const centerX = absX + objOffset.x + radius;
      const centerY = absY + objOffset.y + radius;

      return {
        minX: centerX - radius,
        minY: centerY - radius,
        maxX: centerX + radius,
        maxY: centerY + radius,
      };
    } else {
      // Square
      const width = obj.width || DEFAULT_OBJECT_SIZE;
      const height = obj.height || width;
      const objOffset = getObjectAnchorOffset(anchor, width, height);
      const objX = absX + objOffset.x;
      const objY = absY + objOffset.y;

      return {
        minX: objX,
        minY: objY,
        maxX: objX + width,
        maxY: objY + height,
      };
    }
  }

  /**
   * Calculate grid bounds based on content bounds
   */
  static calculateGridBounds(
    bounds: Bounds,
    gridStep: number
  ): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    return {
      minX: Math.floor(bounds.x / gridStep) * gridStep,
      minY: Math.floor(bounds.y / gridStep) * gridStep,
      maxX: Math.ceil((bounds.x + bounds.width) / gridStep) * gridStep,
      maxY: Math.ceil((bounds.y + bounds.depth) / gridStep) * gridStep,
    };
  }
}
