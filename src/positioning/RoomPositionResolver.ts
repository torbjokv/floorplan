import type { Anchor, Room, ResolvedRoom, RoomPart } from '../types';
import { PositionCalculator } from './PositionCalculator';
import { PartRegistry } from './PartRegistry';

export interface ResolvedPart extends RoomPart {
  x: number;
  y: number;
}

export interface PositioningResult {
  roomMap: Record<string, ResolvedRoom>;
  errors: string[];
  partRegistry: PartRegistry;
}

/**
 * Resolves room and part positions based on their attachment points
 * Handles the iterative positioning algorithm
 */
export class RoomPositionResolver {
  private roomMap: Record<string, ResolvedRoom> = {};
  private errors: string[] = [];
  private partRegistry: PartRegistry = new PartRegistry();

  /**
   * Resolve positions for all rooms and their parts
   */
  resolve(rooms: Room[]): PositioningResult {
    this.roomMap = {};
    this.errors = [];
    this.partRegistry.clear();

    this.resolveTopLevelRooms(rooms);
    this.resolveAllParts();

    // Normalize positions so top-left room's top-left corner is at (0,0)
    this.normalizePositions();

    return {
      roomMap: this.roomMap,
      errors: this.errors,
      partRegistry: this.partRegistry,
    };
  }

  /**
   * Resolve positions for top-level rooms
   */
  private resolveTopLevelRooms(rooms: Room[]): void {
    const unresolved = [...rooms];
    let safety = 20;

    // Handle first room without valid attachTo
    this.handleFirstRoom(rooms, unresolved);

    // Iteratively resolve remaining rooms
    while (unresolved.length && safety--) {
      for (let i = unresolved.length - 1; i >= 0; i--) {
        const room = unresolved[i];
        const position = this.resolveRoomPosition(room);

        if (position) {
          this.roomMap[room.id] = { ...room, ...position } as ResolvedRoom;
          unresolved.splice(i, 1);
        }
      }
    }

    // Report errors for unresolved rooms
    this.reportUnresolvedRooms(unresolved);
  }

  /**
   * Handle first room that may not have valid attachTo
   */
  private handleFirstRoom(rooms: Room[], unresolved: Room[]): void {
    if (rooms.length === 0 || unresolved.length === 0) return;

    const firstRoom = unresolved[0];
    const hasValidAttach =
      firstRoom.attachTo &&
      (firstRoom.attachTo.startsWith('zeropoint:') ||
        rooms.some(r => r.id === firstRoom.attachTo?.split(':')[0]));

    if (!hasValidAttach) {
      this.roomMap[firstRoom.id] = { ...firstRoom, x: 0, y: 0 } as ResolvedRoom;
      unresolved.splice(0, 1);
    }
  }

  /**
   * Resolve position for a single room
   * Returns null if dependencies are not yet resolved
   */
  private resolveRoomPosition(room: Room): { x: number; y: number } | null {
    const [refRoomId, refCorner] = room.attachTo.split(':') as [string, Anchor];

    // Handle zeropoint reference
    if (refRoomId === 'zeropoint') {
      const anchor = room.anchor || 'top-left';
      return PositionCalculator.calculatePosition(
        { x: 0, y: 0 },
        anchor,
        room.width,
        room.depth,
        room.offset
      );
    }

    // Check if reference room is resolved
    const refRoom = this.roomMap[refRoomId];
    if (!refRoom) return null;

    // Calculate position based on reference room's corner
    const anchorPoint = PositionCalculator.getCorner(refRoom, refCorner);
    const anchor = room.anchor || 'top-left';
    return PositionCalculator.calculatePosition(
      anchorPoint,
      anchor,
      room.width,
      room.depth,
      room.offset
    );
  }

  /**
   * Resolve parts for all rooms and add them to roomMap
   */
  private resolveAllParts(): void {
    Object.values(this.roomMap).forEach(room => {
      if (room.parts && room.parts.length > 0) {
        const resolvedParts = this.resolveCompositeRoomParts(room);
        resolvedParts.forEach(part => {
          this.roomMap[part.id] = part as ResolvedRoom;
          this.partRegistry.registerPart(part.id, room.id);
        });
      }
    });
  }

  /**
   * Resolve parts within a composite room
   * Public method for backwards compatibility
   */
  resolveCompositeRoomParts(room: ResolvedRoom): ResolvedPart[] {
    if (!room.parts || room.parts.length === 0) {
      return [];
    }

    const parts: ResolvedPart[] = [];
    const partMap: Record<string, ResolvedPart> = {};
    const unresolved = [...room.parts];
    let safety = 20;

    while (unresolved.length && safety--) {
      for (let i = unresolved.length - 1; i >= 0; i--) {
        const part = unresolved[i];
        if (!part.attachTo) continue;

        const position = this.resolvePartPosition(part, room, partMap);
        if (position) {
          const resolved = { ...part, ...position };
          partMap[part.id] = resolved;
          parts.push(resolved);
          unresolved.splice(i, 1);
        }
      }
    }

    if (unresolved.length) {
      console.error('Some parts could not be placed:', unresolved);
    }

    return parts;
  }

  /**
   * Resolve position for a single part
   */
  private resolvePartPosition(
    part: RoomPart,
    parentRoom: ResolvedRoom,
    partMap: Record<string, ResolvedPart>
  ): { x: number; y: number } | null {
    const [refId, refCorner] = part.attachTo!.split(':') as [string, Anchor];

    // Determine reference (parent or another part)
    let refRoom: ResolvedRoom | ResolvedPart;
    if (refId === 'parent') {
      refRoom = parentRoom;
    } else {
      const found = partMap[refId];
      if (!found) return null;
      refRoom = found;
    }

    // Calculate position
    const anchorPoint = PositionCalculator.getCorner(refRoom as ResolvedRoom, refCorner);
    const anchor = part.anchor || 'top-left';
    return PositionCalculator.calculatePosition(
      anchorPoint,
      anchor,
      part.width,
      part.depth,
      part.offset
    );
  }

  /**
   * Report errors for rooms that couldn't be positioned
   */
  private reportUnresolvedRooms(unresolved: Room[]): void {
    unresolved.forEach(room => {
      const refRoomId = room.attachTo?.split(':')[0];
      const displayName = room.name || room.id;
      this.errors.push(
        `Room "${displayName}" could not be positioned. Referenced room "${refRoomId}" not found or circular dependency detected.`
      );
    });
  }

  /**
   * Normalize all positions so the top-left-most point is at (0,0)
   * This makes "zeropoint" transparent - the origin is always the top-left object
   */
  private normalizePositions(): void {
    const rooms = Object.values(this.roomMap);
    if (rooms.length === 0) return;

    // Find minimum x and y across all rooms (including parts)
    let minX = Infinity;
    let minY = Infinity;

    rooms.forEach(room => {
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
    });

    // If already normalized (top-left at 0,0), nothing to do
    if (minX === 0 && minY === 0) return;

    // Shift all room positions
    rooms.forEach(room => {
      room.x -= minX;
      room.y -= minY;
    });
  }
}
