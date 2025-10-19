import type { ResolvedRoom, Anchor } from '../../types';

const DEFAULT_OBJECT_SIZE = 1000; // mm
const DEFAULT_OBJECT_RADIUS = 500; // mm

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
  getCorner: (room: ResolvedRoom, corner: Anchor) => { x: number; y: number };
  onObjectClick?: (roomId: string, objectIndex: number) => void;
}

// Helper function to calculate anchor offset for objects
function getObjectAnchorOffset(anchor: Anchor, width: number, height: number): { x: number; y: number } {
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

export function RoomObjectsRenderer({ roomMap, dragState, dragOffset, mm, getCorner, onObjectClick }: RoomObjectsRendererProps) {
  return (
    <>
      {Object.values(roomMap).map(room => {
        // Apply drag offset if this room is being dragged
        const isDragging = dragState?.roomId === room.id;
        const transform = isDragging && dragOffset
          ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
          : undefined;

        return (
          <g key={`${room.id}-objects`} transform={transform}>
            {room.objects?.map((obj, idx) => {
              const roomAnchor = obj.roomAnchor || 'top-left';
              const roomCorner = getCorner(room, roomAnchor);
              const absX = roomCorner.x + obj.x;
              const absY = roomCorner.y + obj.y;
              const color = obj.color || '#888';

              if (obj.type === 'circle') {
                const radius = mm(obj.radius || DEFAULT_OBJECT_RADIUS);
                return (
                  <g
                    key={`${room.id}-obj-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onObjectClick?.(room.id, idx);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      className="room-object"
                      cx={mm(absX)}
                      cy={mm(absY)}
                      r={radius}
                      fill={color}
                      stroke="#333"
                      strokeWidth="1"
                    />
                    {obj.text && (
                      <text
                        x={mm(absX)}
                        y={mm(absY)}
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
                const height = obj.height || DEFAULT_OBJECT_SIZE;
                const anchor = obj.anchor || 'top-left';
                const offset = getObjectAnchorOffset(anchor, width, height);

                const rectX = mm(absX + offset.x);
                const rectY = mm(absY + offset.y);
                const w = mm(width);
                const h = mm(height);
                const centerX = rectX + w / 2;
                const centerY = rectY + h / 2;

                return (
                  <g
                    key={`${room.id}-obj-${idx}`}
                    onClick={(e) => {
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
