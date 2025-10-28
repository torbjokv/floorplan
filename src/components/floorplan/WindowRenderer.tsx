import type { Window, WallPosition, ResolvedRoom } from '../../types';

const WINDOW_THICKNESS = 100; // mm

interface WindowRendererProps {
  window: Window;
  index: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onClick?: (windowIndex: number) => void;
}

export function WindowRenderer({ window, index, roomMap, mm, onClick }: WindowRendererProps) {
  const [roomId, wallStr = 'top'] = window.room.split(':') as [string, WallPosition];
  const room = roomMap[roomId];
  if (!room) return null;

  const wall = wallStr as WallPosition;
  const offset = mm(window.offset ?? 0);
  const w = mm(window.width);
  const d = mm(WINDOW_THICKNESS);

  // Calculate position and rotation based on wall
  let posX: number, posY: number, rotation: number;
  let rectX = 0,
    rectY = 0;

  switch (wall) {
    case 'left':
      posX = mm(room.x);
      posY = mm(room.y) + offset;
      rotation = 90;
      rectX = 0; // Window extends into room (rightward)
      rectY = -d; // Shift up by thickness
      break;

    case 'right':
      posX = mm(room.x + room.width);
      posY = mm(room.y) + offset;
      rotation = 90;
      rectX = 0; // Window extends into room (leftward)
      rectY = 0; // Shift up by thickness
      break;

    case 'top':
      posX = mm(room.x) + offset;
      posY = mm(room.y);
      rotation = 0;
      rectX = 0;
      rectY = 0; // Window extends into room (downward)
      break;

    case 'bottom':
      posX = mm(room.x) + offset;
      posY = mm(room.y + room.depth);
      rotation = 0;
      rectX = 0;
      rectY = -d; // Window extends into room (upward)
      break;

    default:
      return null;
  }

  const x = posX;
  const y = posY;

  return (
    <g
      key={`window-${index}`}
      className="window-group"
      transform={`translate(${x},${y}) rotate(${rotation})`}
      onClick={() => onClick?.(index)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={rectX}
        y={rectY}
        width={w}
        height={d}
        fill="lightblue"
        stroke="#444"
        strokeWidth="2"
      />
    </g>
  );
}
