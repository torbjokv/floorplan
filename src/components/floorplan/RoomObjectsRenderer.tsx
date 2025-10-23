import type { ResolvedRoom, Anchor } from '../../types';

const DEFAULT_OBJECT_SIZE = 1000; // mm

interface DragState {
  roomId: string;
  dragType: 'corner' | 'center';
  anchor?: Anchor;
  startMouseX: number;
  startMouseY: number;
  startRoomX: number;
  startRoomY: number;
}

interface RoomObjectsRendererProps {
  roomMap: Record<string, ResolvedRoom>;
  dragState: DragState | null;
  dragOffset: { x: number; y: number } | null;
  mm: (val: number) => number;
  onObjectClick?: (roomId: string, objectIndex: number) => void;
}

// Helper function to get room corner position
function getRoomCorner(room: ResolvedRoom, corner: Anchor): { x: number; y: number } {
  switch (corner) {
    case 'top-left':
      return { x: room.x, y: room.y };
    case 'top-right':
      return { x: room.x + room.width, y: room.y };
    case 'bottom-left':
      return { x: room.x, y: room.y + room.depth };
    case 'bottom-right':
      return { x: room.x + room.width, y: room.y + room.depth };
  }
}

// Helper function to calculate anchor offset for objects
function getObjectAnchorOffset(
  anchor: Anchor,
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

export function RoomObjectsRenderer({
  roomMap,
  dragState,
  dragOffset,
  mm,
  onObjectClick,
}: RoomObjectsRendererProps) {
  return (
    <>
      {Object.values(roomMap).map(room => {
        // Apply drag offset if this room is being dragged
        const isDragging = dragState?.roomId === room.id;
        const transform =
          isDragging && dragOffset
            ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
            : undefined;

        return (
          <g key={`${room.id}-objects`} transform={transform}>
            {room.objects?.map((obj, idx) => {
              // Anchor determines both which room corner AND which object point
              const anchor = obj.anchor || 'top-left';
              const roomCorner = getRoomCorner(room, anchor);

              // Object position is: room corner + x,y offset
              const absX = roomCorner.x + obj.x;
              const absY = roomCorner.y + obj.y;
              const color = obj.color || '#888';

              if (obj.type === 'circle') {
                // For circles, width represents the diameter
                const diameter = obj.width || DEFAULT_OBJECT_SIZE;
                const radius = diameter / 2;

                // Apply object anchor offset to position the circle
                const objOffset = getObjectAnchorOffset(anchor, diameter, diameter);
                const centerX = mm(absX + objOffset.x + radius);
                const centerY = mm(absY + objOffset.y + radius);

                return (
                  <g
                    key={`${room.id}-obj-${idx}`}
                    onClick={e => {
                      e.stopPropagation();
                      onObjectClick?.(room.id, idx);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      className="room-object"
                      cx={centerX}
                      cy={centerY}
                      r={mm(radius)}
                      fill={color}
                      stroke="#333"
                      strokeWidth="1"
                    />
                    {obj.text && (
                      <text
                        x={centerX}
                        y={centerY}
                        fontSize="12"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#000"
                        style={{ pointerEvents: 'none' }}
                      >
                        {obj.text}
                      </text>
                    )}
                  </g>
                );
              } else {
                // Square
                const width = obj.width || DEFAULT_OBJECT_SIZE;
                const height = obj.height || width; // Use width if height not specified
                const objOffset = getObjectAnchorOffset(anchor, width, height);

                const rectX = mm(absX + objOffset.x);
                const rectY = mm(absY + objOffset.y);
                const w = mm(width);
                const h = mm(height);
                const centerX = rectX + w / 2;
                const centerY = rectY + h / 2;

                return (
                  <g
                    key={`${room.id}-obj-${idx}`}
                    onClick={e => {
                      e.stopPropagation();
                      onObjectClick?.(room.id, idx);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      className="room-object"
                      x={rectX}
                      y={rectY}
                      width={w}
                      height={h}
                      fill={color}
                      stroke="#333"
                      strokeWidth="1"
                    />
                    {obj.text && (
                      <text
                        x={centerX}
                        y={centerY}
                        fontSize="12"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#000"
                        style={{ pointerEvents: 'none' }}
                      >
                        {obj.text}
                      </text>
                    )}
                  </g>
                );
              }
            })}
          </g>
        );
      })}
    </>
  );
}
