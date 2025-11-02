import type { ResolvedRoom, Anchor } from '../../types';
import { useState, useCallback, useEffect } from 'react';

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
  onObjectDragUpdate?: (
    sourceRoomId: string,
    objectIndex: number,
    targetRoomId: string,
    newX: number,
    newY: number
  ) => void;
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

// Component for a single object with drag support
function RoomObject({
  room,
  obj,
  idx,
  mm,
  onObjectClick,
  onObjectDragUpdate,
  isDragging: isRoomDragging,
  dragOffset: roomDragOffset,
  roomMap,
}: {
  room: ResolvedRoom;
  obj: any;
  idx: number;
  mm: (val: number) => number;
  onObjectClick?: (roomId: string, objectIndex: number) => void;
  onObjectDragUpdate?: (
    sourceRoomId: string,
    objectIndex: number,
    targetRoomId: string,
    newX: number,
    newY: number
  ) => void;
  isDragging: boolean;
  dragOffset: { x: number; y: number } | null;
  roomMap: Record<string, ResolvedRoom>;
}) {
  const [isObjectDragging, setIsObjectDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartObjX, setDragStartObjX] = useState(0);
  const [dragStartObjY, setDragStartObjY] = useState(0);
  const [currentObjX, setCurrentObjX] = useState(obj.x);
  const [currentObjY, setCurrentObjY] = useState(obj.y);
  const [targetRoomId, setTargetRoomId] = useState(room.id);

  // Convert SVG screen coordinates to mm
  const screenToMM = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const svg = (e.target as SVGElement).ownerSVGElement;
    if (!svg) return { x: 0, y: 0 };

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    return {
      x: svgPt.x * 10,
      y: svgPt.y * 10,
    };
  }, []);

  // Handle mouse down - start dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onObjectDragUpdate) return;
      e.stopPropagation();
      const { x, y } = screenToMM(e);
      setIsObjectDragging(true);
      setDragStartX(x);
      setDragStartY(y);
      setDragStartObjX(obj.x);
      setDragStartObjY(obj.y);
      setCurrentObjX(obj.x);
      setCurrentObjY(obj.y);
    },
    [onObjectDragUpdate, screenToMM, obj.x, obj.y]
  );

  // Helper to find which room contains a point
  const findRoomAtPoint = useCallback((x: number, y: number): ResolvedRoom | null => {
    for (const r of Object.values(roomMap)) {
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.depth) {
        return r;
      }
    }
    return null;
  }, [roomMap]);

  // Add global mouse move and mouse up listeners when dragging
  useEffect(() => {
    if (!isObjectDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isObjectDragging) return;

      // Get SVG element
      const svgElement = document.querySelector('.floorplan-svg') as SVGSVGElement;
      if (!svgElement) return;

      // Convert screen coordinates to SVG coordinates
      const pt = svgElement.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
      const x = svgPt.x * 10;
      const y = svgPt.y * 10;

      // Find which room the mouse is over
      const mouseRoom = findRoomAtPoint(x, y);
      const activeRoom = mouseRoom || room;
      setTargetRoomId(activeRoom.id);

      // Calculate position relative to the target room
      // For cross-room dragging, we need to use top-left anchor relative to the new room
      const anchor = obj.anchor || 'top-left';
      const roomAnchor = mouseRoom ? 'top-left' : (obj.roomAnchor || obj.anchor || 'top-left');

      let width, height;
      if (obj.type === 'circle') {
        const diameter = obj.width || DEFAULT_OBJECT_SIZE;
        width = diameter;
        height = diameter;
      } else {
        width = obj.width || DEFAULT_OBJECT_SIZE;
        height = obj.height || width;
      }

      // Calculate object bounds
      const objOffset = getObjectAnchorOffset(anchor, width, height);
      const roomCorner = getRoomCorner(activeRoom, roomAnchor);

      // Position object so its center follows the mouse
      let newX = x - roomCorner.x - objOffset.x - width / 2;
      let newY = y - roomCorner.y - objOffset.y - height / 2;

      // Clamp to room bounds
      const objLeft = newX + objOffset.x;
      const objTop = newY + objOffset.y;
      const objRight = objLeft + width;
      const objBottom = objTop + height;

      const absObjLeft = roomCorner.x + objLeft;
      const absObjTop = roomCorner.y + objTop;
      const absObjRight = roomCorner.x + objRight;
      const absObjBottom = roomCorner.y + objBottom;

      if (absObjLeft < activeRoom.x) {
        newX = activeRoom.x - roomCorner.x - objOffset.x;
      }
      if (absObjTop < activeRoom.y) {
        newY = activeRoom.y - roomCorner.y - objOffset.y;
      }
      if (absObjRight > activeRoom.x + activeRoom.width) {
        newX = (activeRoom.x + activeRoom.width) - roomCorner.x - objOffset.x - width;
      }
      if (absObjBottom > activeRoom.y + activeRoom.depth) {
        newY = (activeRoom.y + activeRoom.depth) - roomCorner.y - objOffset.y - height;
      }

      setCurrentObjX(newX);
      setCurrentObjY(newY);
    };

    const handleGlobalMouseUp = () => {
      if (!isObjectDragging || !onObjectDragUpdate) return;
      setIsObjectDragging(false);
      onObjectDragUpdate(room.id, idx, targetRoomId, currentObjX, currentObjY);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isObjectDragging, dragStartObjX, dragStartObjY, dragStartX, dragStartY, obj, room, onObjectDragUpdate, idx, currentObjX, currentObjY, targetRoomId, findRoomAtPoint, roomMap]);

  // Use current position when dragging, otherwise use obj position
  const activeX = isObjectDragging ? currentObjX : obj.x;
  const activeY = isObjectDragging ? currentObjY : obj.y;

  // When dragging to a different room, use the target room for rendering
  const renderRoom = isObjectDragging && targetRoomId !== room.id ? roomMap[targetRoomId] : room;
  if (!renderRoom) return null;

  // Anchor determines both which room corner AND which object point
  const anchor = obj.anchor || 'top-left';
  // Use top-left anchor when dragging to a different room
  const roomAnchor = isObjectDragging && targetRoomId !== room.id ? 'top-left' : (obj.roomAnchor || anchor);
  const roomCorner = getRoomCorner(renderRoom, roomAnchor);

  // Object position is: room corner + x,y offset
  const absX = roomCorner.x + activeX;
  const absY = roomCorner.y + activeY;
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
        data-object-index={idx}
        data-room-id={room.id}
        onClick={e => {
          e.stopPropagation();
          if (!isObjectDragging) {
            onObjectClick?.(room.id, idx);
          }
        }}
        onMouseDown={handleMouseDown}
        style={{ cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer' }}
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
    const height = obj.height || width;
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
        data-object-index={idx}
        data-room-id={room.id}
        onClick={e => {
          e.stopPropagation();
          if (!isObjectDragging) {
            onObjectClick?.(room.id, idx);
          }
        }}
        onMouseDown={handleMouseDown}
        style={{ cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer' }}
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
}

export function RoomObjectsRenderer({
  roomMap,
  dragState,
  dragOffset,
  mm,
  onObjectClick,
  onObjectDragUpdate,
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
            {room.objects?.map((obj, idx) => (
              <RoomObject
                key={`${room.id}-obj-${idx}`}
                room={room}
                obj={obj}
                idx={idx}
                mm={mm}
                onObjectClick={onObjectClick}
                onObjectDragUpdate={onObjectDragUpdate}
                isDragging={isDragging}
                dragOffset={dragOffset}
                roomMap={roomMap}
              />
            ))}
          </g>
        );
      })}
    </>
  );
}
