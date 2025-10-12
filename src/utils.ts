import type { Anchor, Point, Room, ResolvedRoom, RoomPart } from './types';

// Fixed scale for display (2 = 1mm real world = 0.2px on screen)
const DISPLAY_SCALE = 1;

export function mm(val: number): number {
  return val * DISPLAY_SCALE / 10;
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
}

export function resolveRoomPositions(rooms: Room[]): PositioningResult {
  const roomMap: Record<string, ResolvedRoom> = {};
  const errors: string[] = [];
  const unresolved = [...rooms];
  let safety = 20;

  while (unresolved.length && safety--) {
    for (let i = unresolved.length - 1; i >= 0; i--) {
      const room = unresolved[i];

      // attachTo has priority over x/y
      if (room.attachTo) {
        const [refRoomName, refCorner] = room.attachTo.split(':') as [string, Anchor];
        const refRoom = roomMap[refRoomName];
        if (!refRoom) continue;

        const attachPos = getCorner(refRoom, refCorner);
        const offset = room.offset || [0, 0];
        const anchor = room.anchor || 'top-left'; // Default to top-left
        const anchorAdjust = getAnchorAdjustment(anchor, room.width, room.depth);
        const x = attachPos.x + offset[0] + anchorAdjust.x;
        const y = attachPos.y + offset[1] + anchorAdjust.y;

        roomMap[room.name] = { ...room, x, y } as ResolvedRoom;
        unresolved.splice(i, 1);
        continue;
      }

      // Use absolute positioning with defaults
      const x = room.x ?? 0; // Default to 0
      const y = room.y ?? 0; // Default to 0
      roomMap[room.name] = { ...room, x, y } as ResolvedRoom;
      unresolved.splice(i, 1);
    }
  }

  if (unresolved.length) {
    unresolved.forEach(room => {
      const refRoomName = room.attachTo?.split(':')[0];
      errors.push(`Room "${room.name}" could not be positioned. Referenced room "${refRoomName}" not found or circular dependency detected.`);
    });
  }

  return { roomMap, errors };
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

      const [refName, refCorner] = part.attachTo.split(':') as [string, Anchor];

      let refRoom: ResolvedRoom | ResolvedPart;
      if (refName === 'parent') {
        refRoom = room;
      } else {
        const found = partMap[refName];
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
      partMap[part.name] = resolved;
      parts.push(resolved);
      unresolved.splice(i, 1);
    }
  }

  if (unresolved.length) {
    console.error('Some parts could not be placed:', unresolved);
  }

  return parts;
}
