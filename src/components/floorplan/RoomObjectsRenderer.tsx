import type { ResolvedRoom, Anchor, RoomObject as RoomObjectType } from '../../types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ObjectResizeHandles } from './ObjectResizeHandles';

const DEFAULT_OBJECT_SIZE = 1000; // mm
const HANDLE_HITBOX_SIZE_PX = 50; // pixels - must match ObjectResizeHandles

interface EditableObjectLabelProps {
  object: RoomObjectType;
  x: number;
  y: number;
  onNameUpdate?: (roomId: string, objectIndex: number, newName: string) => void;
  roomId: string;
  objectIndex: number;
}

function EditableObjectLabel({
  object,
  x,
  y,
  onNameUpdate,
  roomId,
  objectIndex,
}: EditableObjectLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(object.text || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(object.text || '');
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() !== (object.text || '')) {
      onNameUpdate?.(roomId, objectIndex, editValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(object.text || '');
    }
  };

  if (isEditing) {
    return (
      <foreignObject x={x - 100} y={y - 15} width={200} height={30}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            textAlign: 'center',
            fontSize: '12px',
            border: '2px solid #4a90e2',
            borderRadius: '4px',
            padding: '2px 4px',
            background: 'white',
            color: 'black',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </foreignObject>
    );
  }

  if (!object.text) return null;

  return (
    <text
      x={x}
      y={y}
      fontSize="12"
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#000"
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'text', userSelect: 'none', pointerEvents: 'all' }}
    >
      {object.text}
    </text>
  );
}

interface EditableObjectDimensionsProps {
  object: RoomObjectType;
  x: number;
  y: number;
  onDimensionsUpdate?: (
    roomId: string,
    objectIndex: number,
    width: number,
    height?: number
  ) => void;
  roomId: string;
  objectIndex: number;
}

function EditableObjectDimensions({
  object,
  x,
  y,
  onDimensionsUpdate,
  roomId,
  objectIndex,
}: EditableObjectDimensionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [widthValue, setWidthValue] = useState(object.width.toString());
  const [heightValue, setHeightValue] = useState(
    (object.type === 'circle' ? object.width : object.height || object.width).toString()
  );
  const widthInputRef = useRef<HTMLInputElement>(null);
  const heightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && widthInputRef.current) {
      widthInputRef.current.focus();
      widthInputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setWidthValue(object.width.toString());
    setHeightValue(
      (object.type === 'circle' ? object.width : object.height || object.width).toString()
    );
  };

  const handleBlur = () => {
    setIsEditing(false);
    const newWidth = parseInt(widthValue, 10);
    const newHeight = parseInt(heightValue, 10);

    if (!isNaN(newWidth) && newWidth >= 100) {
      if (object.type === 'circle') {
        if (newWidth !== object.width) {
          onDimensionsUpdate?.(roomId, objectIndex, newWidth);
        }
      } else {
        if (!isNaN(newHeight) && newHeight >= 100) {
          if (newWidth !== object.width || newHeight !== (object.height || object.width)) {
            onDimensionsUpdate?.(roomId, objectIndex, newWidth, newHeight);
          }
        }
      }
    }
  };

  const handleWidthKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setWidthValue(object.width.toString());
      setHeightValue(
        (object.type === 'circle' ? object.width : object.height || object.width).toString()
      );
    } else if (e.key === 'Tab' && !e.shiftKey && object.type !== 'circle') {
      e.preventDefault();
      heightInputRef.current?.focus();
      heightInputRef.current?.select();
    }
  };

  const handleHeightKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setWidthValue(object.width.toString());
      setHeightValue(
        (object.type === 'circle' ? object.width : object.height || object.width).toString()
      );
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      widthInputRef.current?.focus();
      widthInputRef.current?.select();
    }
  };

  if (isEditing) {
    if (object.type === 'circle') {
      return (
        <foreignObject x={x - 75} y={y - 15} width={150} height={30}>
          <div
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <span style={{ color: 'black', fontSize: '12px' }}>⌀</span>
            <input
              ref={widthInputRef}
              type="number"
              value={widthValue}
              onChange={e => setWidthValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleWidthKeyDown}
              placeholder="Diameter"
              style={{
                width: '80px',
                height: '100%',
                textAlign: 'center',
                fontSize: '11px',
                border: '2px solid #4a90e2',
                borderRadius: '4px',
                padding: '2px',
                background: 'white',
                color: 'black',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </foreignObject>
      );
    } else {
      return (
        <foreignObject x={x - 100} y={y - 15} width={200} height={30}>
          <div
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <input
              ref={widthInputRef}
              type="number"
              value={widthValue}
              onChange={e => setWidthValue(e.target.value)}
              onKeyDown={handleWidthKeyDown}
              placeholder="Width"
              style={{
                width: '60px',
                height: '100%',
                textAlign: 'center',
                fontSize: '11px',
                border: '2px solid #4a90e2',
                borderRadius: '4px',
                padding: '2px',
                background: 'white',
                color: 'black',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ color: 'black', fontSize: '12px', fontWeight: 'bold' }}>×</span>
            <input
              ref={heightInputRef}
              type="number"
              value={heightValue}
              onChange={e => setHeightValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleHeightKeyDown}
              placeholder="Height"
              style={{
                width: '60px',
                height: '100%',
                textAlign: 'center',
                fontSize: '11px',
                border: '2px solid #4a90e2',
                borderRadius: '4px',
                padding: '2px',
                background: 'white',
                color: 'black',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </foreignObject>
      );
    }
  }

  // Safety check: don't render if object doesn't have valid dimensions
  if (!object || !object.width || object.width <= 0) return null;

  const dimensionText =
    object.type === 'circle'
      ? `⌀${object.width}`
      : `${object.width}×${object.height || object.width}`;

  return (
    <text
      x={x}
      y={y}
      fontSize="10"
      textAnchor="middle"
      dominantBaseline="middle"
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'text', userSelect: 'none', fill: '#888', pointerEvents: 'all' }}
    >
      {dimensionText}mm
    </text>
  );
}

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
  onObjectNameUpdate?: (roomId: string, objectIndex: number, newName: string) => void;
  onObjectDimensionsUpdate?: (
    roomId: string,
    objectIndex: number,
    width: number,
    height?: number
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
  isDragging: _isRoomDragging,
  dragOffset: _roomDragOffset,
  roomMap,
  isHovered,
  onObjectMouseEnter,
  onObjectMouseLeave,
  onObjectResizeStart,
  onObjectResizeNumeric,
  onObjectNameUpdate,
  onObjectDimensionsUpdate,
  partId,
}: {
  room: ResolvedRoom;
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
  onObjectNameUpdate?: (roomId: string, objectIndex: number, newName: string) => void;
  onObjectDimensionsUpdate?: (
    roomId: string,
    objectIndex: number,
    width: number,
    height?: number
  ) => void;
  partId?: string;
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
  const findRoomAtPoint = useCallback(
    (x: number, y: number): ResolvedRoom | null => {
      for (const r of Object.values(roomMap)) {
        if (r.id === 'zeropoint') continue; // Skip virtual zeropoint
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.depth) {
          return r;
        }
      }
      return null;
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
      setTargetRoomId(mouseRoom?.id || 'freestanding');

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
  }, [
    isObjectDragging,
    dragStartObjX,
    dragStartObjY,
    dragStartX,
    dragStartY,
    obj,
    room,
    onObjectDragUpdate,
    idx,
    currentObjX,
    currentObjY,
    targetRoomId,
    findRoomAtPoint,
    roomMap,
  ]);

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
  const testIdBase = partId
    ? `object-${room.id}-part-${partId}-${idx}`
    : `object-${room.id}-${idx}`;

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
          onMouseEnter={() => onObjectMouseEnter?.(room.id, idx, partId)}
          onMouseLeave={onObjectMouseLeave}
        >
          {/* Invisible expanded hover area - includes handle space */}
          <rect
            x={boundingBoxX}
            y={boundingBoxY}
            width={boundingBoxWidth}
            height={boundingBoxHeight}
            fill="transparent"
            pointerEvents="visiblePainted"
          />
          {/* Visible circle */}
          <circle
            data-testid={testIdBase}
            data-object-index={idx}
            data-room-id={room.id}
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
                onObjectClick?.(room.id, idx);
              }
            }}
            onMouseDown={handleMouseDown}
            style={{
              cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer',
            }}
          />
          <EditableObjectLabel
            object={obj}
            x={centerX}
            y={centerY - (obj.text ? 8 : 0)}
            onNameUpdate={onObjectNameUpdate}
            roomId={room.id}
            objectIndex={idx}
          />
          <EditableObjectDimensions
            object={obj}
            x={centerX}
            y={centerY + (obj.text ? 16 : 8)}
            onDimensionsUpdate={onObjectDimensionsUpdate}
            roomId={room.id}
            objectIndex={idx}
          />
        </g>
        {isHovered && onObjectResizeStart && (
          <ObjectResizeHandles
            room={room}
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
            onMouseEnter={() => onObjectMouseEnter?.(room.id, idx, partId)}
            visible={isHovered}
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
            data-room-id={room.id}
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
                onObjectClick?.(room.id, idx);
              }
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => onObjectMouseEnter?.(room.id, idx, partId)}
            onMouseLeave={onObjectMouseLeave}
            style={{
              cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer',
            }}
          />
          <EditableObjectLabel
            object={obj}
            x={centerX}
            y={centerY - (obj.text ? 8 : 0)}
            onNameUpdate={onObjectNameUpdate}
            roomId={room.id}
            objectIndex={idx}
          />
          <EditableObjectDimensions
            object={obj}
            x={centerX}
            y={centerY + (obj.text ? 16 : 8)}
            onDimensionsUpdate={onObjectDimensionsUpdate}
            roomId={room.id}
            objectIndex={idx}
          />
        </g>
        {isHovered && onObjectResizeStart && (
          <ObjectResizeHandles
            room={room}
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
            onMouseEnter={() => onObjectMouseEnter?.(room.id, idx, partId)}
            visible={isHovered}
            partId={partId}
          />
        )}
      </>
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
  hoveredObject,
  onObjectMouseEnter,
  onObjectMouseLeave,
  onObjectResizeStart,
  onObjectResizeNumeric,
  onObjectNameUpdate,
  onObjectDimensionsUpdate,
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
                onObjectNameUpdate={onObjectNameUpdate}
                onObjectDimensionsUpdate={onObjectDimensionsUpdate}
              />
            ))}
            {/* Render part-level objects */}
            {room.parts?.map(part =>
              part.objects?.map((obj, idx) => (
                <RoomObject
                  key={`${room.id}-part-${part.id}-obj-${idx}`}
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
                    hoveredObject?.partId === part.id
                  }
                  onObjectMouseEnter={onObjectMouseEnter}
                  onObjectMouseLeave={onObjectMouseLeave}
                  onObjectResizeStart={onObjectResizeStart}
                  onObjectResizeNumeric={onObjectResizeNumeric}
                  onObjectNameUpdate={onObjectNameUpdate}
                  onObjectDimensionsUpdate={onObjectDimensionsUpdate}
                  partId={part.id}
                />
              ))
            )}
          </g>
        );
      })}
    </>
  );
}
