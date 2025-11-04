import type { ResolvedRoom, Anchor, RoomObject as RoomObjectType } from '../../types';
import { ObjectResizeHandles } from './ObjectResizeHandles';
import { resolveCompositeRoom } from '../../utils';

const DEFAULT_OBJECT_SIZE = 1000; // mm

interface RoomObjectsRendererProps {
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  hoveredObject: { roomId: string; objectIndex: number; partId?: string } | null;
  onObjectMouseEnter: (roomId: string, objectIndex: number, partId?: string) => void;
  onObjectMouseLeave: () => void;
  onObjectClick?: (roomId: string, objectIndex: number) => void;
  onObjectDragUpdate?: (
    sourceRoomId: string,
    objectIndex: number,
    targetRoomId: string,
    newX: number,
    newY: number
  ) => void;
  onObjectResizeStart?: (
    roomId: string,
    objectIndex: number,
    corner: Anchor,
    partId?: string
  ) => void;
  onObjectResizeNumeric?: (
    roomId: string,
    objectIndex: number,
    corner: Anchor,
    currentWidth: number,
    currentHeight?: number,
    partId?: string
  ) => void;
  onObjectNameUpdate?: (roomId: string, objectIndex: number, newName: string) => void;
  onObjectDimensionsUpdate?: (
    roomId: string,
    objectIndex: number,
    width: number,
    height?: number
  ) => void;
}

export function RoomObjectsRenderer({
  roomMap,
  mm,
  hoveredObject,
  onObjectMouseEnter,
  onObjectMouseLeave,
  onObjectClick: _onObjectClick,
  onObjectDragUpdate: _onObjectDragUpdate,
  onObjectResizeStart,
  onObjectResizeNumeric,
  onObjectNameUpdate,
  onObjectDimensionsUpdate,
}: RoomObjectsRendererProps) {
  return (
    <g className="room-objects">
      {Object.values(roomMap).map(room => {
        // Skip virtual zeropoint room
        if (room.id === 'zeropoint') return null;

        // Get resolved parts with x/y coordinates
        const resolvedParts = resolveCompositeRoom(room);

        // Render room-level objects
        const roomObjects = (room.objects || []).map((obj, idx) => (
          <RoomObject
            key={`${room.id}-obj-${idx}`}
            obj={obj}
            idx={idx}
            room={room}
            mm={mm}
            isHovered={
              hoveredObject?.roomId === room.id &&
              hoveredObject?.objectIndex === idx &&
              !hoveredObject?.partId
            }
            onHover={() => onObjectMouseEnter(room.id, idx)}
            onLeave={onObjectMouseLeave}
            onResizeStart={onObjectResizeStart}
            onResizeNumeric={onObjectResizeNumeric}
            onNameUpdate={onObjectNameUpdate}
            onDimensionsUpdate={onObjectDimensionsUpdate}
          />
        ));

        // Render part-level objects
        const partObjects = resolvedParts.flatMap(part =>
          (part.objects || []).map((obj, idx) => (
            <RoomObject
              key={`${room.id}-part-${part.id}-obj-${idx}`}
              obj={obj}
              idx={idx}
              room={room}
              partId={part.id}
              partX={part.x}
              partY={part.y}
              mm={mm}
              isHovered={
                hoveredObject?.roomId === room.id &&
                hoveredObject?.objectIndex === idx &&
                hoveredObject?.partId === part.id
              }
              onHover={() => onObjectMouseEnter(room.id, idx, part.id)}
              onLeave={onObjectMouseLeave}
              onResizeStart={onObjectResizeStart}
              onResizeNumeric={onObjectResizeNumeric}
              onNameUpdate={onObjectNameUpdate}
              onDimensionsUpdate={onObjectDimensionsUpdate}
            />
          ))
        );

        return (
          <g key={room.id}>
            {roomObjects}
            {partObjects}
          </g>
        );
      })}
    </g>
  );
}

interface RoomObjectProps {
  obj: RoomObjectType;
  idx: number;
  room: ResolvedRoom;
  partId?: string;
  partX?: number;
  partY?: number;
  mm: (val: number) => number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onResizeStart?: (roomId: string, objectIndex: number, corner: Anchor, partId?: string) => void;
  onResizeNumeric?: (
    roomId: string,
    objectIndex: number,
    corner: Anchor,
    currentWidth: number,
    currentHeight?: number,
    partId?: string
  ) => void;
  onNameUpdate?: (roomId: string, objectIndex: number, newName: string) => void;
  onDimensionsUpdate?: (
    roomId: string,
    objectIndex: number,
    width: number,
    height?: number
  ) => void;
}

function RoomObject({
  obj,
  idx,
  room,
  partId,
  partX,
  partY,
  mm,
  isHovered,
  onHover,
  onLeave,
  onResizeStart,
  onResizeNumeric,
}: RoomObjectProps) {
  // Calculate object's absolute position
  const roomAnchor = obj.roomAnchor || 'top-left';
  const objAnchor = obj.anchor || 'top-left';

  // Start with room's corner position (or part's position if in a part)
  let anchorX = room.x;
  let anchorY = room.y;

  // For objects in parts, use the resolved part position
  if (partId !== undefined && partX !== undefined && partY !== undefined) {
    anchorX = partX;
    anchorY = partY;
  }

  // Adjust based on roomAnchor
  const width = room.width;
  const depth = room.depth;

  switch (roomAnchor) {
    case 'top-left':
      // already at top-left
      break;
    case 'top-right':
      anchorX += width;
      break;
    case 'bottom-left':
      anchorY += depth;
      break;
    case 'bottom-right':
      anchorX += width;
      anchorY += depth;
      break;
  }

  // Add object's offset from that anchor
  let objX = anchorX + obj.x;
  let objY = anchorY + obj.y;

  // Adjust for object's anchor point
  const objWidth = obj.width || DEFAULT_OBJECT_SIZE;
  const objHeight = obj.type === 'circle' ? objWidth : obj.height || objWidth;

  switch (objAnchor) {
    case 'top-left':
      // no adjustment needed
      break;
    case 'top-right':
      objX -= objWidth;
      break;
    case 'bottom-left':
      objY -= objHeight;
      break;
    case 'bottom-right':
      objX -= objWidth;
      objY -= objHeight;
      break;
  }

  const absolutePosition = { x: objX, y: objY };

  // Render based on shape
  if (obj.type === 'circle') {
    const radius = objWidth / 2;
    const centerX = mm(objX + radius);
    const centerY = mm(objY + radius);

    return (
      <g
        className="room-object"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        style={{ pointerEvents: 'all' }}
      >
        <circle
          cx={centerX}
          cy={centerY}
          r={mm(radius)}
          fill={obj.color || '#33d17a'}
          stroke={isHovered ? '#4a90e2' : '#333'}
          strokeWidth={isHovered ? '2' : '1'}
          style={{ pointerEvents: 'all', cursor: 'pointer' }}
        />
        {obj.text && (
          <text
            x={centerX}
            y={centerY - (obj.text ? 8 : 0)}
            fontSize="12"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {obj.text}
          </text>
        )}
        {/* Always show dimensions */}
        <text
          x={centerX}
          y={centerY + (obj.text ? 16 : 8)}
          fontSize="10"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#888"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          ⌀{objWidth}mm
        </text>
        {isHovered && (
          <ObjectResizeHandles
            room={room}
            objectIndex={idx}
            object={obj}
            absolutePosition={absolutePosition}
            mm={mm}
            onResizeStart={onResizeStart}
            onResizeNumeric={onResizeNumeric}
            partId={partId}
          />
        )}
      </g>
    );
  } else {
    // Square object
    const rectX = mm(objX);
    const rectY = mm(objY);
    const w = mm(objWidth);
    const h = mm(objHeight);
    const centerX = rectX + w / 2;
    const centerY = rectY + h / 2;

    return (
      <g
        className="room-object"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        style={{ pointerEvents: 'all' }}
      >
        <rect
          x={rectX}
          y={rectY}
          width={w}
          height={h}
          fill={obj.color || '#33d17a'}
          stroke={isHovered ? '#4a90e2' : '#333'}
          strokeWidth={isHovered ? '2' : '1'}
          style={{ pointerEvents: 'all', cursor: 'pointer' }}
        />
        {obj.text && (
          <text
            x={centerX}
            y={centerY - (obj.text ? 8 : 0)}
            fontSize="12"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {obj.text}
          </text>
        )}
        {/* Always show dimensions */}
        <text
          x={centerX}
          y={centerY + (obj.text ? 16 : 8)}
          fontSize="10"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#888"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {objWidth}×{objHeight}mm
        </text>
        {isHovered && (
          <ObjectResizeHandles
            room={room}
            objectIndex={idx}
            object={obj}
            absolutePosition={absolutePosition}
            mm={mm}
            onResizeStart={onResizeStart}
            onResizeNumeric={onResizeNumeric}
            partId={partId}
          />
        )}
      </g>
    );
  }
}
