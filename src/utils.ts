import type { Anchor, Point, Room, ResolvedRoom } from './types';
import {
  PositionCalculator,
  RoomPositionResolver,
  type PositioningResult as NewPositioningResult,
  type ResolvedPart,
} from './positioning';

// Fixed scale for display (2 = 1mm real world = 0.2px on screen)
const DISPLAY_SCALE = 1;

export function mm(val: number): number {
  return (val * DISPLAY_SCALE) / 10;
}

// Re-export positioning utilities for backwards compatibility
export function getCorner(room: ResolvedRoom, corner: Anchor): Point {
  return PositionCalculator.getCorner(room, corner);
}

export function getAnchorAdjustment(anchor: Anchor, width: number, depth: number): Point {
  return PositionCalculator.getAnchorAdjustment(anchor, width, depth);
}

// Legacy interface for backwards compatibility
export interface PositioningResult {
  roomMap: Record<string, ResolvedRoom>;
  errors: string[];
  partIds: Set<string>; // Track which IDs in roomMap are parts, not top-level rooms
  partToParent: Map<string, string>; // Map part IDs to their parent room IDs
}

/**
 * Resolve room positions using the new positioning system
 * This function maintains backwards compatibility with the old interface
 */
export function resolveRoomPositions(rooms: Room[]): PositioningResult {
  const resolver = new RoomPositionResolver();
  const result: NewPositioningResult = resolver.resolve(rooms);

  // Convert new result format to legacy format
  return {
    roomMap: result.roomMap,
    errors: result.errors,
    partIds: result.partRegistry.getAllPartIds(),
    partToParent: new Map(
      Array.from(result.partRegistry.getAllPartIds()).map(partId => [
        partId,
        result.partRegistry.getParentId(partId)!,
      ])
    ),
  };
}

/**
 * Resolve composite room parts
 * This is maintained for backwards compatibility
 */
export function resolveCompositeRoom(room: ResolvedRoom): ResolvedPart[] {
  if (!room.parts || room.parts.length === 0) {
    return [];
  }

  // Use the resolver's method directly with the already-resolved room
  const resolver = new RoomPositionResolver();
  return resolver.resolveCompositeRoomParts(room);
}
