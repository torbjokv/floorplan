import type { WallPosition } from '../../types';

type ResizeEnd = 'start' | 'end';

interface DoorWindowResizeHandlesProps {
  // Position and dimensions in screen coordinates (already converted via mm())
  x: number;
  y: number;
  width: number; // Width along the wall direction (in screen coords)
  thickness: number; // Thickness perpendicular to wall (in screen coords)
  wall: WallPosition | null; // null for freestanding
  rotation?: number; // Rotation in degrees (for freestanding)
  onResizeStart?: (end: ResizeEnd) => void;
  onResizeNumeric?: (end: ResizeEnd, currentWidth: number) => void;
  onMouseEnter?: () => void;
  visible?: boolean;
}

const HANDLE_SIZE = 8; // pixels - visual size
const HANDLE_HITBOX_SIZE = 30; // pixels - larger clickable area
const HANDLE_COLOR = '#4a90e2';

export function DoorWindowResizeHandles({
  x,
  y,
  width,
  thickness,
  wall,
  rotation = 0,
  onResizeStart,
  onResizeNumeric,
  onMouseEnter,
  visible = true,
}: DoorWindowResizeHandlesProps) {
  if (!visible) return null;

  // Calculate handle positions based on wall orientation
  // For horizontal walls (top/bottom): handles on left and right ends
  // For vertical walls (left/right): handles on top and bottom ends
  // For freestanding: use rotation to determine orientation

  let isHorizontal: boolean;
  if (wall) {
    isHorizontal = wall === 'top' || wall === 'bottom';
  } else {
    // For freestanding, check if rotation makes it vertical
    const normalizedRotation = ((rotation % 180) + 180) % 180;
    isHorizontal = normalizedRotation < 45 || normalizedRotation > 135;
  }

  // Calculate center of the element
  const centerX = x + width / 2;
  const centerY = y + thickness / 2;

  let handles: Array<{
    end: ResizeEnd;
    centerX: number;
    centerY: number;
    cursor: string;
  }>;

  if (isHorizontal) {
    // Handles on left and right
    handles = [
      {
        end: 'start',
        centerX: x,
        centerY: centerY,
        cursor: 'ew-resize',
      },
      {
        end: 'end',
        centerX: x + width,
        centerY: centerY,
        cursor: 'ew-resize',
      },
    ];
  } else {
    // Handles on top and bottom
    handles = [
      {
        end: 'start',
        centerX: centerX,
        centerY: y,
        cursor: 'ns-resize',
      },
      {
        end: 'end',
        centerX: centerX,
        centerY: y + thickness,
        cursor: 'ns-resize',
      },
    ];
  }

  // For rotated elements (vertical walls), we need to swap width/thickness in the handle positions
  if (wall === 'left' || wall === 'right') {
    // For vertical walls, the "width" of the door/window runs vertically
    // So handles should be at top and bottom of the element
    handles = [
      {
        end: 'start',
        centerX: x + thickness / 2,
        centerY: y,
        cursor: 'ns-resize',
      },
      {
        end: 'end',
        centerX: x + thickness / 2,
        centerY: y + width, // width is the length along the wall
        cursor: 'ns-resize',
      },
    ];
  }

  return (
    <g className="door-window-resize-handles" onMouseEnter={onMouseEnter}>
      {handles.map(handle => (
        <g key={handle.end}>
          {/* Visible handle */}
          <rect
            x={handle.centerX - HANDLE_SIZE / 2}
            y={handle.centerY - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill={HANDLE_COLOR}
            stroke="#fff"
            strokeWidth="1.5"
            rx="2"
            className={`door-window-resize-handle door-window-resize-handle-${handle.end}`}
            pointerEvents="none"
          />
          {/* Invisible larger hitbox */}
          <rect
            data-testid={`door-window-resize-handle-${handle.end}`}
            x={handle.centerX - HANDLE_HITBOX_SIZE / 2}
            y={handle.centerY - HANDLE_HITBOX_SIZE / 2}
            width={HANDLE_HITBOX_SIZE}
            height={HANDLE_HITBOX_SIZE}
            fill="transparent"
            cursor={handle.cursor}
            className="door-window-resize-handle-hitbox"
            onMouseEnter={onMouseEnter}
            onMouseDown={e => {
              e.stopPropagation();
              onResizeStart?.(handle.end);
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              // Pass width in mm (will be converted by parent)
              onResizeNumeric?.(handle.end, 0); // 0 is placeholder, parent calculates actual width
            }}
          />
        </g>
      ))}
    </g>
  );
}

export type { ResizeEnd };
