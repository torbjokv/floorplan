import type { Anchor, Point, Room, ResolvedRoom, RoomAddition } from './types';

export function mm(val: number, scale: number): number {
  return val * scale / 10;
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
      return { x, y: y + room.height };
    case 'bottom-right':
      return { x: x + room.width, y: y + room.height };
    default:
      return { x, y };
  }
}

export function getAnchorAdjustment(anchor: Anchor, width: number, height: number): Point {
  switch (anchor) {
    case 'top-left':
      return { x: 0, y: 0 };
    case 'top-right':
      return { x: -width, y: 0 };
    case 'bottom-left':
      return { x: 0, y: -height };
    case 'bottom-right':
      return { x: -width, y: -height };
    default:
      return { x: 0, y: 0 };
  }
}

interface ResolvedAddition extends RoomAddition {
  x: number;
  y: number;
}

export function resolveRoomPositions(rooms: Room[]): Record<string, ResolvedRoom> {
  const roomMap: Record<string, ResolvedRoom> = {};
  const unresolved = [...rooms];
  let safety = 20;

  while (unresolved.length && safety--) {
    for (let i = unresolved.length - 1; i >= 0; i--) {
      const room = unresolved[i];

      // Already has x/y
      if ('x' in room && 'y' in room && room.x !== undefined && room.y !== undefined) {
        roomMap[room.name] = room as ResolvedRoom;
        unresolved.splice(i, 1);
        continue;
      }

      if (!room.attachTo || !room.anchor) continue;

      const [refRoomName, refCorner] = room.attachTo.split(':') as [string, Anchor];
      const refRoom = roomMap[refRoomName];
      if (!refRoom) continue;

      const attachPos = getCorner(refRoom, refCorner);
      const offset = room.offset || [0, 0];
      const anchorAdjust = getAnchorAdjustment(room.anchor, room.width, room.height);
      const x = attachPos.x + offset[0] + anchorAdjust.x;
      const y = attachPos.y + offset[1] + anchorAdjust.y;

      roomMap[room.name] = { ...room, x, y } as ResolvedRoom;
      unresolved.splice(i, 1);
    }
  }

  if (unresolved.length) {
    //TODO: show in editor
    console.error('Some rooms could not be placed. Check references:', unresolved);
  }

  return roomMap;
}

export function resolveCompositeRoom(room: ResolvedRoom): ResolvedAddition[] {
  if (!room.addition || room.addition.length === 0) {
    return [];
  }

  const additions: ResolvedAddition[] = [];
  const additionMap: Record<string, ResolvedAddition> = {};
  const unresolved = [...room.addition];
  let safety = 20;

  while (unresolved.length && safety--) {
    for (let i = unresolved.length - 1; i >= 0; i--) {
      const addition = unresolved[i];

      if (!addition.attachTo || !addition.anchor) continue;

      const [refName, refCorner] = addition.attachTo.split(':') as [string, Anchor];

      let refRoom: ResolvedRoom | ResolvedAddition;
      if (refName === 'parent') {
        refRoom = room;
      } else {
        const found = additionMap[refName];
        if (!found) continue;
        refRoom = found;
      }

      const attachPos = getCorner(refRoom as ResolvedRoom, refCorner);
      const offset = addition.offset || [0, 0];
      const anchorAdjust = getAnchorAdjustment(addition.anchor, addition.width, addition.height);
      const x = attachPos.x + offset[0] + anchorAdjust.x;
      const y = attachPos.y + offset[1] + anchorAdjust.y;

      const resolved = { ...addition, x, y };
      additionMap[addition.name] = resolved;
      additions.push(resolved);
      unresolved.splice(i, 1);
    }
  }

  if (unresolved.length) {
    console.error('Some additions could not be placed:', unresolved);
  }

  return additions;
}
