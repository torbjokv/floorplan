import type { Door, WallPosition, ResolvedRoom } from '../../types';

const DOOR_THICKNESS = 100; // mm

interface DoorRendererProps {
  door: Door;
  index: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onClick?: (doorIndex: number) => void;
}

export function DoorRenderer({ door, index, roomMap, mm, onClick }: DoorRendererProps) {
  const [roomId, wallStr = 'left'] = door.room.split(':') as [string, WallPosition];
  const room = roomMap[roomId];
  if (!room) return null;

  const wall = wallStr as WallPosition;
  const offset = mm(door.offset ?? 0);
  const swing = door.swing || 'inwards-right';
  const w = mm(door.width);
  const d = mm(DOOR_THICKNESS);

  // Check if this is an opening (no door blade)
  const isOpening = swing === 'opening';

  // Determine if door swings inwards or outwards, and left or right
  const isInwards = swing.startsWith('inwards');
  const isRight = swing.endsWith('right');

  // Calculate position based on wall and offset
  let x: number, y: number;
  let doorRect: { x: number; y: number; width: number; height: number };
  let arcPath: string;

  switch (wall) {
    case 'bottom':
      // Bottom wall - door opens into room (upward)
      x = mm(room.x) + offset;
      y = mm(room.y + room.depth);

      if (isInwards) {
        // Door swings into room (upward)
        doorRect = { x: 0, y: -d, width: w, height: d };
        if (isRight) {
          // Hinge on right, arc from right edge to left
          arcPath = `M ${w} ${-d} A ${w} ${w} 0 0 0 0 ${-d - w}`;
        } else {
          // Hinge on left, arc from left edge to right
          arcPath = `M 0 ${-d} A ${w} ${w} 0 0 1 ${w} ${-d - w}`;
        }
      } else {
        // Door swings out of room (downward)
        doorRect = { x: 0, y: 0, width: w, height: d };
        if (isRight) {
          // Hinge on right, arc from right edge outward
          arcPath = `M ${w} 0 A ${w} ${w} 0 0 1 0 ${w}`;
        } else {
          // Hinge on left, arc from left edge outward
          arcPath = `M 0 0 A ${w} ${w} 0 0 0 ${w} ${w}`;
        }
      }
      break;

    case 'top':
      // Top wall - door opens into room (downward)
      x = mm(room.x) + offset;
      y = mm(room.y);

      if (isInwards) {
        // Door swings into room (downward)
        doorRect = { x: 0, y: 0, width: w, height: d };
        if (isRight) {
          // Hinge on right, arc from right edge to left
          arcPath = `M ${w} ${d} A ${w} ${w} 0 0 1 0 ${d + w}`;
        } else {
          // Hinge on left, arc from left edge to right
          arcPath = `M 0 ${d} A ${w} ${w} 0 0 0 ${w} ${d + w}`;
        }
      } else {
        // Door swings out of room (upward)
        doorRect = { x: 0, y: -d, width: w, height: d };
        if (isRight) {
          // Hinge on right, arc from right edge outward
          arcPath = `M ${w} ${-d} A ${w} ${w} 0 0 0 0 ${-d - w}`;
        } else {
          // Hinge on left, arc from left edge outward
          arcPath = `M 0 ${-d} A ${w} ${w} 0 0 1 ${w} ${-d - w}`;
        }
      }
      break;

    case 'left':
      // Left wall - door opens into room (rightward)
      x = mm(room.x);
      y = mm(room.y) + offset;

      if (isInwards) {
        // Door swings into room (rightward)
        doorRect = { x: 0, y: 0, width: d, height: w };
        if (isRight) {
          // Hinge on bottom, arc from bottom edge upward
          arcPath = `M ${d} ${w} A ${w} ${w} 0 0 0 ${d + w} 0`;
        } else {
          // Hinge on top, arc from top edge downward
          arcPath = `M ${d} 0 A ${w} ${w} 0 0 1 ${d + w} ${w}`;
        }
      } else {
        // Door swings out of room (leftward)
        doorRect = { x: -d, y: 0, width: d, height: w };
        if (isRight) {
          // Hinge on bottom, arc from bottom edge outward
          arcPath = `M ${-d} ${w} A ${w} ${w} 0 0 1 ${-d - w} 0`;
        } else {
          // Hinge on top, arc from top edge outward
          arcPath = `M ${-d} 0 A ${w} ${w} 0 0 0 ${-d - w} ${w}`;
        }
      }
      break;

    case 'right':
      // Right wall - door opens into room (leftward)
      x = mm(room.x + room.width);
      y = mm(room.y) + offset;

      if (isInwards) {
        // Door swings into room (leftward)
        doorRect = { x: -d, y: 0, width: d, height: w };
        if (isRight) {
          // Hinge on bottom, arc from bottom edge upward
          arcPath = `M ${-d} ${w} A ${w} ${w} 0 0 1 ${-d - w} 0`;
        } else {
          // Hinge on top, arc from top edge downward
          arcPath = `M ${-d} 0 A ${w} ${w} 0 0 0 ${-d - w} ${w}`;
        }
      } else {
        // Door swings out of room (rightward)
        doorRect = { x: 0, y: 0, width: d, height: w };
        if (isRight) {
          // Hinge on bottom, arc from bottom edge outward
          arcPath = `M ${d} ${w} A ${w} ${w} 0 0 0 ${d + w} 0`;
        } else {
          // Hinge on top, arc from top edge outward
          arcPath = `M ${d} 0 A ${w} ${w} 0 0 1 ${d + w} ${w}`;
        }
      }
      break;

    default:
      return null;
  }

  return (
    <g
      key={`door-${index}`}
      className="door-group"
      onClick={() => onClick?.(index)}
      style={{ cursor: 'pointer' }}
    >
      {/* Door rectangle (always shown) */}
      <rect
        x={x + doorRect.x}
        y={y + doorRect.y}
        width={doorRect.width}
        height={doorRect.height}
        fill="saddlebrown"
        stroke="#333"
        strokeWidth="1"
      />
      {/* Door swing arc (not shown for openings) */}
      {!isOpening && (
        <path
          d={arcPath}
          transform={`translate(${x},${y})`}
          fill="none"
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="4,2"
        />
      )}
    </g>
  );
}
