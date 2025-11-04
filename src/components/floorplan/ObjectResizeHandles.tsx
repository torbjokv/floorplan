import type { ResolvedRoom, RoomObject, Anchor } from '../../types';

interface ObjectResizeHandlesProps {
  room: ResolvedRoom;
  objectIndex: number;
  object: RoomObject;
  absolutePosition: { x: number; y: number }; // Object's absolute position in mm
  mm: (val: number) => number;
  onResizeStart?: (roomId: string, objectIndex: number, corner: Anchor) => void;
  onResizeNumeric?: (
    roomId: string,
    objectIndex: number,
    corner: Anchor,
    currentWidth: number,
    currentHeight?: number
  ) => void;
  onMouseEnter?: () => void;
  visible?: boolean;
  partId?: string; // Optional part ID if object is in a part
}

const HANDLE_SIZE = 8; // pixels - smaller than room handles
const HANDLE_HITBOX_SIZE = 50; // pixels - larger clickable area for easier grabbing
const HANDLE_COLOR = '#4a90e2';

export function ObjectResizeHandles({
  room,
  objectIndex,
  object,
  absolutePosition,
  mm,
  onResizeStart,
  onResizeNumeric,
  onMouseEnter,
  visible = true,
  partId,
}: ObjectResizeHandlesProps) {
  if (!visible) return null;

  const objWidth = object.width;
  const objHeight = object.type === 'circle' ? object.width : object.height || object.width;

  // Generate test ID base
  const testIdBase = partId
    ? `${room.id}-part-${partId}-${objectIndex}`
    : `${room.id}-${objectIndex}`;

  // Calculate corner positions for handles (in screen pixels)
  const corners: Array<{
    anchor: Anchor;
    centerX: number; // Center point of the corner in screen pixels
    centerY: number;
    cursor: string;
  }> = [
    {
      anchor: 'top-left',
      centerX: mm(absolutePosition.x),
      centerY: mm(absolutePosition.y),
      cursor: 'nwse-resize',
    },
    {
      anchor: 'top-right',
      centerX: mm(absolutePosition.x + objWidth),
      centerY: mm(absolutePosition.y),
      cursor: 'nesw-resize',
    },
    {
      anchor: 'bottom-left',
      centerX: mm(absolutePosition.x),
      centerY: mm(absolutePosition.y + objHeight),
      cursor: 'nesw-resize',
    },
    {
      anchor: 'bottom-right',
      centerX: mm(absolutePosition.x + objWidth),
      centerY: mm(absolutePosition.y + objHeight),
      cursor: 'nwse-resize',
    },
  ];

  return (
    <g className="object-resize-handles" onMouseEnter={onMouseEnter}>
      {corners.map(corner => (
        <g key={corner.anchor}>
          {/* Visible handle - centered on corner */}
          <rect
            x={corner.centerX - HANDLE_SIZE / 2}
            y={corner.centerY - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill={HANDLE_COLOR}
            stroke="#fff"
            strokeWidth="1.5"
            rx="2"
            className={`object-resize-handle object-resize-handle-${corner.anchor}`}
            pointerEvents="none"
          />
          {/* Invisible larger hitbox - also centered on corner */}
          <rect
            data-testid={`object-resize-handle-${testIdBase}-${corner.anchor}`}
            x={corner.centerX - HANDLE_HITBOX_SIZE / 2}
            y={corner.centerY - HANDLE_HITBOX_SIZE / 2}
            width={HANDLE_HITBOX_SIZE}
            height={HANDLE_HITBOX_SIZE}
            fill="transparent"
            cursor={corner.cursor}
            className="object-resize-handle-hitbox"
            onMouseEnter={onMouseEnter}
            onMouseDown={e => {
              e.stopPropagation();
              onResizeStart?.(room.id, objectIndex, corner.anchor);
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              onResizeNumeric?.(
                room.id,
                objectIndex,
                corner.anchor,
                object.width,
                object.type === 'circle' ? undefined : object.height || object.width
              );
            }}
          />
        </g>
      ))}
    </g>
  );
}
