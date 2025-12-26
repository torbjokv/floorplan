import type { ResolvedRoom, Anchor, RoomObject as RoomObjectType } from '../../types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ObjectResizeHandles } from './ObjectResizeHandles';

const DEFAULT_OBJECT_SIZE = 1000; // mm
const HANDLE_HITBOX_SIZE_PX = 50; // pixels - must match ObjectResizeHandles

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
  partIds: Set<string>;
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
  hoveredObject?: { roomId: string; objectIndex: number; partId?: string } | null;
  onObjectMouseEnter?: (roomId: string, objectIndex: number, partId?: string) => void;
  onObjectMouseLeave?: () => void;
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
  focusedObject?: { roomId: string; objectIndex: number; partId?: string } | null;
  onObjectFocus?: (roomId: string, objectIndex: number, partId?: string) => void;
  onObjectTextUpdate?: (
    roomId: string,
    objectIndex: number,
    currentText: string | undefined,
    partId?: string
  ) => void;
  onObjectColorUpdate?: (
    roomId: string,
    objectIndex: number,
    currentColor: string | undefined,
    partId?: string
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
  parentRoomId,
  obj,
  idx,
  mm,
  onObjectClick,
  onObjectDragUpdate,
  isDragging: _isRoomDragging,
  dragOffset: _roomDragOffset,
  roomMap,
  isHovered: _isHovered,
  onObjectMouseEnter,
  onObjectMouseLeave,
  onObjectResizeStart,
  onObjectResizeNumeric,
  partId,
  isFocused,
  onFocus,
  onTextUpdate,
  onColorUpdate,
}: {
  room: ResolvedRoom;
  parentRoomId?: string; // Parent room ID for test IDs when room is a part
  obj: RoomObjectType;
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
  isHovered: boolean;
  onObjectMouseEnter?: (roomId: string, objectIndex: number, partId?: string) => void;
  onObjectMouseLeave?: () => void;
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
  partId?: string;
  isFocused?: boolean;
  onFocus?: (roomId: string, objectIndex: number, partId?: string) => void;
  onTextUpdate?: (
    roomId: string,
    objectIndex: number,
    currentText: string | undefined,
    partId?: string
  ) => void;
  onColorUpdate?: (
    roomId: string,
    objectIndex: number,
    currentColor: string | undefined,
    partId?: string
  ) => void;
}) {
  const [isObjectDragging, setIsObjectDragging] = useState(false);
  const [currentObjX, setCurrentObjX] = useState(obj.x);
  const [currentObjY, setCurrentObjY] = useState(obj.y);
  const [targetRoomId, setTargetRoomId] = useState(room.id);

  // Show resize handles when focused (via click) - not just on hover
  const showHandles = isFocused && !isObjectDragging;

  // Use refs to avoid stale closure issues in mouseup handler
  const currentObjXRef = useRef(obj.x);
  const currentObjYRef = useRef(obj.y);
  const targetRoomIdRef = useRef(room.id);

  // Handle mouse down - start dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onObjectDragUpdate) return;
      e.stopPropagation();
      setIsObjectDragging(true);
      setCurrentObjX(obj.x);
      setCurrentObjY(obj.y);
      // Initialize refs for mouseup handler
      currentObjXRef.current = obj.x;
      currentObjYRef.current = obj.y;
      targetRoomIdRef.current = room.id;
    },
    [onObjectDragUpdate, obj.x, obj.y, room.id]
  );

  // Helper to find which room contains a point
  // When multiple rooms contain the point (e.g., a part inside a room),
  // prefer the smaller one (the part) for more precise targeting
  const findRoomAtPoint = useCallback(
    (x: number, y: number): ResolvedRoom | null => {
      let bestMatch: ResolvedRoom | null = null;
      let bestArea = Infinity;

      for (const r of Object.values(roomMap)) {
        if (r.id === 'zeropoint') continue; // Skip virtual zeropoint
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.depth) {
          const area = r.width * r.depth;
          if (area < bestArea) {
            bestMatch = r;
            bestArea = area;
          }
        }
      }
      return bestMatch;
    },
    [roomMap]
  );

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
      const newTargetRoomId = mouseRoom?.id || 'freestanding';
      setTargetRoomId(newTargetRoomId);
      targetRoomIdRef.current = newTargetRoomId;

      let width, height;
      if (obj.type === 'circle') {
        const diameter = obj.width || DEFAULT_OBJECT_SIZE;
        width = diameter;
        height = diameter;
      } else {
        width = obj.width || DEFAULT_OBJECT_SIZE;
        height = obj.height || width;
      }

      let newX, newY;

      if (mouseRoom) {
        // Inside a room - calculate position relative to room top-left
        // Position so the object center follows the mouse
        newX = x - mouseRoom.x - width / 2;
        newY = y - mouseRoom.y - height / 2;
      } else {
        // Freestanding - use absolute coordinates with object center at mouse
        newX = x - width / 2;
        newY = y - height / 2;
      }

      setCurrentObjX(newX);
      setCurrentObjY(newY);
      currentObjXRef.current = newX;
      currentObjYRef.current = newY;
    };

    const handleGlobalMouseUp = () => {
      if (!isObjectDragging || !onObjectDragUpdate) return;
      setIsObjectDragging(false);
      // Use room.id as source - for room objects this is the room id,
      // for part objects this is the part id (since room = resolvedPart)
      const sourceRoomId = room.id;
      // Use refs to get the latest values (avoids stale closure issue)
      onObjectDragUpdate(
        sourceRoomId,
        idx,
        targetRoomIdRef.current,
        currentObjXRef.current,
        currentObjYRef.current
      );
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isObjectDragging, obj, room, onObjectDragUpdate, idx, findRoomAtPoint]);

  // Use current position when dragging, otherwise use obj position
  const activeX = isObjectDragging ? currentObjX : obj.x;
  const activeY = isObjectDragging ? currentObjY : obj.y;

  // Determine absolute position based on drag state
  let absX, absY;
  const anchor = obj.anchor || 'top-left';

  if (isObjectDragging && targetRoomId === 'freestanding') {
    // Dragging outside any room - use absolute coordinates
    absX = activeX;
    absY = activeY;
  } else {
    // Inside a room (current or target)
    const renderRoom = isObjectDragging && targetRoomId !== room.id ? roomMap[targetRoomId] : room;
    if (!renderRoom) return null;

    const roomAnchor =
      isObjectDragging && targetRoomId !== room.id ? 'top-left' : obj.roomAnchor || anchor;
    const roomCorner = getRoomCorner(renderRoom, roomAnchor);

    // Object position is: room corner + x,y offset
    absX = roomCorner.x + activeX;
    absY = roomCorner.y + activeY;
  }
  const color = obj.color || '#888';
  // Use parentRoomId for test IDs when this is a part object
  const roomIdForTestId = parentRoomId || room.id;
  const testIdBase = partId
    ? `object-${roomIdForTestId}-part-${partId}-${idx}`
    : `object-${roomIdForTestId}-${idx}`;

  if (obj.type === 'circle') {
    // For circles, width represents the diameter
    const diameter = obj.width || DEFAULT_OBJECT_SIZE;
    const radius = diameter / 2;

    // Apply object anchor offset to position the circle
    const objOffset = getObjectAnchorOffset(anchor, diameter, diameter);
    const circleCenterMmX = absX + objOffset.x + radius;
    const circleCenterMmY = absY + objOffset.y + radius;
    const centerX = mm(circleCenterMmX);
    const centerY = mm(circleCenterMmY);

    // Calculate absolute position for resize handles (top-left corner of VISUAL bounding box)
    // The visual bounding box is centered on the circle, so top-left is at center - radius
    const absolutePosition = {
      x: circleCenterMmX - radius,
      y: circleCenterMmY - radius,
    };

    // Calculate expanded bounding box for hover area (includes handle hitboxes)
    const hoverPadding = HANDLE_HITBOX_SIZE_PX / 2;
    const boundingBoxX = mm(absolutePosition.x) - hoverPadding;
    const boundingBoxY = mm(absolutePosition.y) - hoverPadding;
    const boundingBoxWidth = mm(diameter) + HANDLE_HITBOX_SIZE_PX;
    const boundingBoxHeight = mm(diameter) + HANDLE_HITBOX_SIZE_PX;

    return (
      <>
        <g
          key={`${room.id}-obj-${idx}`}
          onMouseEnter={() => onObjectMouseEnter?.(roomIdForTestId, idx, partId)}
          onMouseLeave={onObjectMouseLeave}
        >
          {/* Invisible expanded hover area - includes handle space */}
          <rect
            x={boundingBoxX}
            y={boundingBoxY}
            width={boundingBoxWidth}
            height={boundingBoxHeight}
            fill="transparent"
            pointerEvents="all"
          />
          {/* Visible circle */}
          <circle
            data-testid={testIdBase}
            data-object-index={idx}
            data-room-id={roomIdForTestId}
            className="room-object"
            cx={centerX}
            cy={centerY}
            r={mm(radius)}
            fill={color}
            stroke="#333"
            strokeWidth="1"
            pointerEvents="visiblePainted"
            onClick={e => {
              e.stopPropagation();
              if (!isObjectDragging) {
                onObjectClick?.(roomIdForTestId, idx);
                onFocus?.(roomIdForTestId, idx, partId);
              }
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              onColorUpdate?.(roomIdForTestId, idx, obj.color, partId);
            }}
            onMouseDown={handleMouseDown}
            style={{
              cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer',
            }}
          />
          {obj.text && (
            <text
              data-testid={`${testIdBase}-text`}
              x={centerX}
              y={centerY - 10}
              fontSize="12"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#000"
              style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              onDoubleClick={e => {
                e.stopPropagation();
                onTextUpdate?.(roomIdForTestId, idx, obj.text, partId);
              }}
            >
              {obj.text}
            </text>
          )}
          <text
            data-testid={`${testIdBase}-dimensions`}
            x={centerX}
            y={obj.text ? centerY + 12 : centerY}
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#888"
            style={{
              pointerEvents: 'auto',
              cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer',
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={e => {
              e.stopPropagation();
              onObjectResizeNumeric?.(roomIdForTestId, idx, anchor, diameter, undefined, partId);
            }}
          >
            ⌀{diameter}
          </text>
        </g>
        {showHandles && onObjectResizeStart && (
          <ObjectResizeHandles
            room={room}
            parentRoomId={parentRoomId}
            objectIndex={idx}
            object={obj}
            absolutePosition={absolutePosition}
            mm={mm}
            onResizeStart={(roomId, objIdx, corner) =>
              onObjectResizeStart(roomId, objIdx, corner, partId)
            }
            onResizeNumeric={(roomId, objIdx, corner, width, height) =>
              onObjectResizeNumeric?.(roomId, objIdx, corner, width, height, partId)
            }
            onMouseEnter={() => onObjectMouseEnter?.(roomIdForTestId, idx, partId)}
            visible={showHandles}
            partId={partId}
          />
        )}
      </>
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

    // Calculate absolute position for resize handles (top-left corner)
    const absolutePosition = {
      x: absX + objOffset.x,
      y: absY + objOffset.y,
    };

    return (
      <>
        <g key={`${room.id}-obj-${idx}`}>
          {/* Visible rect with hover detection */}
          <rect
            data-testid={testIdBase}
            data-object-index={idx}
            data-room-id={roomIdForTestId}
            className="room-object"
            x={rectX}
            y={rectY}
            width={w}
            height={h}
            fill={color}
            stroke="#333"
            strokeWidth="1"
            pointerEvents="visiblePainted"
            onClick={e => {
              e.stopPropagation();
              if (!isObjectDragging) {
                onObjectClick?.(roomIdForTestId, idx);
                onFocus?.(roomIdForTestId, idx, partId);
              }
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              onColorUpdate?.(roomIdForTestId, idx, obj.color, partId);
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => onObjectMouseEnter?.(roomIdForTestId, idx, partId)}
            onMouseLeave={onObjectMouseLeave}
            style={{
              cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer',
            }}
          />
          {obj.text && (
            <text
              data-testid={`${testIdBase}-text`}
              x={centerX}
              y={centerY - 10}
              fontSize="12"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#000"
              style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              onDoubleClick={e => {
                e.stopPropagation();
                onTextUpdate?.(roomIdForTestId, idx, obj.text, partId);
              }}
            >
              {obj.text}
            </text>
          )}
          <text
            data-testid={`${testIdBase}-dimensions`}
            x={centerX}
            y={obj.text ? centerY + 12 : centerY}
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#888"
            style={{
              pointerEvents: 'auto',
              cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer',
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={e => {
              e.stopPropagation();
              onObjectResizeNumeric?.(roomIdForTestId, idx, anchor, width, height, partId);
            }}
          >
            {width}×{height}
          </text>
        </g>
        {showHandles && onObjectResizeStart && (
          <ObjectResizeHandles
            room={room}
            parentRoomId={parentRoomId}
            objectIndex={idx}
            object={obj}
            absolutePosition={absolutePosition}
            mm={mm}
            onResizeStart={(roomId, objIdx, corner) =>
              onObjectResizeStart(roomId, objIdx, corner, partId)
            }
            onResizeNumeric={(roomId, objIdx, corner, width, height) =>
              onObjectResizeNumeric?.(roomId, objIdx, corner, width, height, partId)
            }
            onMouseEnter={() => onObjectMouseEnter?.(roomIdForTestId, idx, partId)}
            visible={showHandles}
            partId={partId}
          />
        )}
      </>
    );
  }
}

export function RoomObjectsRenderer({
  roomMap,
  partIds,
  dragState,
  dragOffset,
  mm,
  onObjectClick,
  onObjectDragUpdate,
  hoveredObject,
  onObjectMouseEnter,
  onObjectMouseLeave,
  onObjectResizeStart,
  onObjectResizeNumeric,
  focusedObject,
  onObjectFocus,
  onObjectTextUpdate,
  onObjectColorUpdate,
}: RoomObjectsRendererProps) {
  return (
    <>
      {Object.values(roomMap)
        .filter(room => !partIds.has(room.id)) // Only process top-level rooms, not parts
        .map(room => {
          // Apply drag offset if this room is being dragged
          const isDragging = dragState?.roomId === room.id;
          const transform =
            isDragging && dragOffset
              ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
              : undefined;

          return (
            <g key={`${room.id}-objects`} transform={transform}>
              {/* Render room-level objects */}
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
                  isHovered={
                    hoveredObject?.roomId === room.id &&
                    hoveredObject?.objectIndex === idx &&
                    !hoveredObject?.partId
                  }
                  onObjectMouseEnter={onObjectMouseEnter}
                  onObjectMouseLeave={onObjectMouseLeave}
                  onObjectResizeStart={onObjectResizeStart}
                  onObjectResizeNumeric={onObjectResizeNumeric}
                  isFocused={
                    focusedObject?.roomId === room.id &&
                    focusedObject?.objectIndex === idx &&
                    !focusedObject?.partId
                  }
                  onFocus={onObjectFocus}
                  onTextUpdate={onObjectTextUpdate}
                  onColorUpdate={onObjectColorUpdate}
                />
              ))}
              {/* Render part-level objects */}
              {room.parts?.map(part => {
                // Get the resolved part from roomMap (has correct x,y coordinates)
                const resolvedPart = roomMap[part.id];
                if (!resolvedPart) return null;
                return part.objects?.map((obj, idx) => (
                  <RoomObject
                    key={`${room.id}-part-${part.id}-obj-${idx}`}
                    room={resolvedPart}
                    parentRoomId={room.id}
                    obj={obj}
                    idx={idx}
                    mm={mm}
                    onObjectClick={onObjectClick}
                    onObjectDragUpdate={onObjectDragUpdate}
                    isDragging={isDragging}
                    dragOffset={dragOffset}
                    roomMap={roomMap}
                    isHovered={
                      hoveredObject?.roomId === room.id &&
                      hoveredObject?.objectIndex === idx &&
                      hoveredObject?.partId === part.id
                    }
                    onObjectMouseEnter={onObjectMouseEnter}
                    onObjectMouseLeave={onObjectMouseLeave}
                    onObjectResizeStart={onObjectResizeStart}
                    onObjectResizeNumeric={onObjectResizeNumeric}
                    partId={part.id}
                    isFocused={
                      focusedObject?.roomId === room.id &&
                      focusedObject?.objectIndex === idx &&
                      focusedObject?.partId === part.id
                    }
                    onFocus={onObjectFocus}
                    onTextUpdate={onObjectTextUpdate}
                    onColorUpdate={onObjectColorUpdate}
                  />
                ));
              })}
            </g>
          );
        })}
    </>
  );
}
