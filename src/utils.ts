import type { Anchor, Point, Room, ResolvedRoom, RoomPart } from './types';

// Fixed scale for display (2 = 1mm real world = 0.2px on screen)
const DISPLAY_SCALE = 1;

export function mm(val: number): number {
  return (val * DISPLAY_SCALE) / 10;
}

export function getCorner(room: ResolvedRoom, corner: Anchor): Point {
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

export function getAnchorAdjustment(anchor: Anchor, width: number, depth: number): Point {
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

interface ResolvedPart extends RoomPart {
  x: number;
  y: number;
}

export interface PositioningResult {
  roomMap: Record<string, ResolvedRoom>;
  errors: string[];
  partIds: Set<string>; // Track which IDs in roomMap are parts, not top-level rooms
}

export function resolveRoomPositions(rooms: Room[]): PositioningResult {
  const roomMap: Record<string, ResolvedRoom> = {};
  const errors: string[] = [];
  const partIds = new Set<string>(); // Track part IDs
  const unresolved = [...rooms];
  let safety = 20;

  // If first room has no valid attachTo or references a non-existent room, place it at 0,0
  if (rooms.length > 0 && unresolved.length > 0) {
    const firstRoom = unresolved[0];
    const hasValidAttach =
      firstRoom.attachTo &&
      (firstRoom.attachTo.startsWith('zeropoint:') ||
        rooms.some(r => r.id === firstRoom.attachTo?.split(':')[0]));

    if (!hasValidAttach) {
      // Place first room at 0,0
      roomMap[firstRoom.id] = { ...firstRoom, x: 0, y: 0 } as ResolvedRoom;
      unresolved.splice(0, 1);
    }
  }

  while (unresolved.length && safety--) {
    for (let i = unresolved.length - 1; i >= 0; i--) {
      const room = unresolved[i];

      const [refRoomId, refCorner] = room.attachTo.split(':') as [string, Anchor];

      // Handle special "zeropoint" reference (virtual point at 0,0)
      if (refRoomId === 'zeropoint') {
        const offset = room.offset || [0, 0];
        const anchor = room.anchor || 'top-left';
        const anchorAdjust = getAnchorAdjustment(anchor, room.width, room.depth);
        const x = offset[0] + anchorAdjust.x;
        const y = offset[1] + anchorAdjust.y;

        roomMap[room.id] = { ...room, x, y } as ResolvedRoom;
        unresolved.splice(i, 1);
        continue;
      }

      const refRoom = roomMap[refRoomId];
      if (!refRoom) continue;

      const attachPos = getCorner(refRoom, refCorner);
      const offset = room.offset || [0, 0];
      const anchor = room.anchor || 'top-left'; // Default to top-left
      const anchorAdjust = getAnchorAdjustment(anchor, room.width, room.depth);
      const x = attachPos.x + offset[0] + anchorAdjust.x;
      const y = attachPos.y + offset[1] + anchorAdjust.y;

      roomMap[room.id] = { ...room, x, y } as ResolvedRoom;
      unresolved.splice(i, 1);
    }
  }

  if (unresolved.length) {
    unresolved.forEach(room => {
      const refRoomId = room.attachTo?.split(':')[0];
      const displayName = room.name || room.id;
      errors.push(
        `Room "${displayName}" could not be positioned. Referenced room "${refRoomId}" not found or circular dependency detected.`
      );
    });
  }

  // Add resolved parts to the roomMap so doors and windows can reference them
  Object.values(roomMap).forEach(room => {
    if (room.parts && room.parts.length > 0) {
      const resolvedParts = resolveCompositeRoom(room);
      resolvedParts.forEach(part => {
        roomMap[part.id] = part as ResolvedRoom;
        partIds.add(part.id); // Track that this ID is a part
      });
    }
  });

  // Note: No longer require Zero Point connection - first room automatically placed at 0,0

  return { roomMap, errors, partIds };
}

export function resolveCompositeRoom(room: ResolvedRoom): ResolvedPart[] {
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

      const [refId, refCorner] = part.attachTo.split(':') as [string, Anchor];

      let refRoom: ResolvedRoom | ResolvedPart;
      if (refId === 'parent') {
        refRoom = room;
      } else {
        const found = partMap[refId];
        if (!found) continue;
        refRoom = found;
      }

      const attachPos = getCorner(refRoom as ResolvedRoom, refCorner);
      const offset = part.offset || [0, 0];
      const anchor = part.anchor || 'top-left'; // Default to top-left
      const anchorAdjust = getAnchorAdjustment(anchor, part.width, part.depth);
      const x = attachPos.x + offset[0] + anchorAdjust.x;
      const y = attachPos.y + offset[1] + anchorAdjust.y;

      const resolved = { ...part, x, y };
      partMap[part.id] = resolved;
      parts.push(resolved);
      unresolved.splice(i, 1);
    }
  }

  if (unresolved.length) {
    console.error('Some parts could not be placed:', unresolved);
  }

  return parts;
}
