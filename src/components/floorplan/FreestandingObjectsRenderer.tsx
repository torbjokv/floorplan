import { useState, useCallback, useEffect } from 'react';
import type { RoomObject, ResolvedRoom, Anchor } from '../../types';
import { ObjectResizeHandles } from './ObjectResizeHandles';

const DEFAULT_OBJECT_SIZE = 1000; // mm
const HANDLE_HITBOX_SIZE_PX = 50; // pixels - must match ObjectResizeHandles

interface FreestandingObjectsRendererProps {
  objects: RoomObject[];
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onObjectClick?: (objectIndex: number) => void;
  onObjectDragUpdate?: (
    objectIndex: number,
    targetRoomId: string,
    newX: number,
    newY: number
  ) => void;
  hoveredObjectIndex?: number | null;
  onObjectMouseEnter?: (objectIndex: number) => void;
  onObjectMouseLeave?: () => void;
  onObjectResizeStart?: (objectIndex: number, corner: Anchor) => void;
  onObjectResizeNumeric?: (
    objectIndex: number,
    corner: Anchor,
    currentWidth: number,
    currentHeight?: number
  ) => void;
  focusedObjectIndex?: number | null;
  onObjectFocus?: (objectIndex: number) => void;
}

export function FreestandingObjectsRenderer({
  objects,
  roomMap,
  mm,
  onObjectClick,
  onObjectDragUpdate,
  hoveredObjectIndex,
  onObjectMouseEnter,
  onObjectMouseLeave,
  onObjectResizeStart,
  onObjectResizeNumeric,
  focusedObjectIndex,
  onObjectFocus,
}: FreestandingObjectsRendererProps) {
  return (
    <g className="freestanding-objects">
      {objects.map((obj, idx) => (
        <FreestandingObject
          key={`freestanding-object-${idx}`}
          obj={obj}
          idx={idx}
          roomMap={roomMap}
          mm={mm}
          onObjectClick={onObjectClick}
          onObjectDragUpdate={onObjectDragUpdate}
          isHovered={hoveredObjectIndex === idx}
          onObjectMouseEnter={onObjectMouseEnter}
          onObjectMouseLeave={onObjectMouseLeave}
          onObjectResizeStart={onObjectResizeStart}
          onObjectResizeNumeric={onObjectResizeNumeric}
          isFocused={focusedObjectIndex === idx}
          onFocus={onObjectFocus}
        />
      ))}
    </g>
  );
}

interface FreestandingObjectProps {
  obj: RoomObject;
  idx: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onObjectClick?: (objectIndex: number) => void;
  onObjectDragUpdate?: (
    objectIndex: number,
    targetRoomId: string,
    newX: number,
    newY: number
  ) => void;
  isHovered: boolean;
  onObjectMouseEnter?: (objectIndex: number) => void;
  onObjectMouseLeave?: () => void;
  onObjectResizeStart?: (objectIndex: number, corner: Anchor) => void;
  onObjectResizeNumeric?: (
    objectIndex: number,
    corner: Anchor,
    currentWidth: number,
    currentHeight?: number
  ) => void;
  isFocused?: boolean;
  onFocus?: (objectIndex: number) => void;
}

function FreestandingObject({
  obj,
  idx,
  roomMap,
  mm,
  onObjectClick,
  onObjectDragUpdate,
  isHovered: _isHovered,
  onObjectMouseEnter,
  onObjectMouseLeave,
  onObjectResizeStart,
  onObjectResizeNumeric,
  isFocused,
  onFocus,
}: FreestandingObjectProps) {
  const [isObjectDragging, setIsObjectDragging] = useState(false);
  const [currentObjX, setCurrentObjX] = useState(obj.x);
  const [currentObjY, setCurrentObjY] = useState(obj.y);
  const [targetRoomId, setTargetRoomId] = useState<string>('freestanding');

  // Show resize handles when focused (via click) - not just on hover
  const showHandles = isFocused && !isObjectDragging;

  const width = obj.width || DEFAULT_OBJECT_SIZE;
  const height = obj.type === 'circle' ? width : obj.height || width;
  const anchor = obj.anchor || 'top-left';

  // Handle mouse down - start dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onObjectDragUpdate) return;
      e.stopPropagation();
      setIsObjectDragging(true);
      setCurrentObjX(obj.x);
      setCurrentObjY(obj.y);
    },
    [onObjectDragUpdate, obj.x, obj.y]
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

      let newX, newY;

      if (mouseRoom) {
        // Inside a room - calculate position relative to room top-left
        const roomCorner = { x: mouseRoom.x, y: mouseRoom.y };
        newX = x - roomCorner.x - width / 2;
        newY = y - roomCorner.y - height / 2;
      } else {
        // Freestanding - use absolute coordinates
        newX = x - width / 2;
        newY = y - height / 2;
      }

      setCurrentObjX(newX);
      setCurrentObjY(newY);
    };

    const handleGlobalMouseUp = () => {
      if (!isObjectDragging || !onObjectDragUpdate) return;
      setIsObjectDragging(false);
      onObjectDragUpdate(idx, targetRoomId, currentObjX, currentObjY);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    isObjectDragging,
    findRoomAtPoint,
    width,
    height,
    onObjectDragUpdate,
    idx,
    targetRoomId,
    currentObjX,
    currentObjY,
  ]);

  // Calculate display position based on drag state
  let displayX, displayY;

  if (isObjectDragging && targetRoomId !== 'freestanding') {
    // Dragging into a room - currentObjX/Y are room-relative, convert to absolute
    const targetRoom = roomMap[targetRoomId];
    if (targetRoom) {
      displayX = targetRoom.x + currentObjX;
      displayY = targetRoom.y + currentObjY;
    } else {
      displayX = obj.x;
      displayY = obj.y;
    }
  } else if (isObjectDragging) {
    // Dragging freestanding - currentObjX/Y are already absolute
    displayX = currentObjX;
    displayY = currentObjY;
  } else {
    // Not dragging - use stored position
    displayX = obj.x;
    displayY = obj.y;
  }

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onObjectClick?.(idx);
      onFocus?.(idx);
    },
    [onObjectClick, onFocus, idx]
  );

  if (obj.type === 'circle') {
    const diameter = width;
    const radius = diameter / 2;
    const centerX = mm(displayX + radius);
    const centerY = mm(displayY + radius);

    // Calculate absolute position for resize handles (top-left corner of VISUAL bounding box)
    const absolutePosition = {
      x: displayX,
      y: displayY,
    };

    // Calculate expanded bounding box for hover area (includes handle hitboxes)
    const hoverPadding = HANDLE_HITBOX_SIZE_PX / 2;
    const boundingBoxX = mm(displayX) - hoverPadding;
    const boundingBoxY = mm(displayY) - hoverPadding;
    const boundingBoxWidth = mm(diameter) + HANDLE_HITBOX_SIZE_PX;
    const boundingBoxHeight = mm(diameter) + HANDLE_HITBOX_SIZE_PX;

    // Create a virtual room for resize handles (freestanding objects use zeropoint)
    const virtualRoom = { id: 'freestanding', x: 0, y: 0, width: 0, depth: 0, attachTo: '' };

    return (
      <>
        <g
          className="freestanding-object"
          data-testid={`freestanding-object-${idx}`}
          data-object-index={idx}
          onMouseEnter={() => onObjectMouseEnter?.(idx)}
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
            cx={centerX}
            cy={centerY}
            r={mm(radius)}
            fill={obj.color || '#33d17a'}
            stroke="#333"
            strokeWidth="1"
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            style={{
              cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer',
            }}
          />
          {obj.text && (
            <text
              x={centerX}
              y={centerY - 10}
              fontSize="12"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#000"
              style={{ pointerEvents: 'none' }}
            >
              {obj.text}
            </text>
          )}
          <text
            data-testid={`freestanding-object-${idx}-dimensions`}
            x={centerX}
            y={obj.text ? centerY + 12 : centerY}
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#888"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onDoubleClick={e => {
              e.stopPropagation();
              onObjectResizeNumeric?.(idx, anchor, diameter, undefined);
            }}
          >
            ⌀{diameter}
          </text>
        </g>
        {showHandles && onObjectResizeStart && (
          <ObjectResizeHandles
            room={virtualRoom}
            objectIndex={idx}
            object={obj}
            absolutePosition={absolutePosition}
            mm={mm}
            onResizeStart={(_roomId, objIdx, corner) => onObjectResizeStart(objIdx, corner)}
            onResizeNumeric={(_roomId, objIdx, corner, w, h) =>
              onObjectResizeNumeric?.(objIdx, corner, w, h)
            }
            onMouseEnter={() => onObjectMouseEnter?.(idx)}
            visible={showHandles}
          />
        )}
      </>
    );
  } else {
    const rectX = mm(displayX);
    const rectY = mm(displayY);
    const w = mm(width);
    const h = mm(height);
    const centerX = rectX + w / 2;
    const centerY = rectY + h / 2;

    // Calculate absolute position for resize handles (top-left corner)
    const absolutePosition = {
      x: displayX,
      y: displayY,
    };

    // Create a virtual room for resize handles (freestanding objects use zeropoint)
    const virtualRoom = { id: 'freestanding', x: 0, y: 0, width: 0, depth: 0, attachTo: '' };

    return (
      <>
        <g
          className="freestanding-object"
          data-testid={`freestanding-object-${idx}`}
          data-object-index={idx}
        >
          {/* Visible rect with hover detection */}
          <rect
            x={rectX}
            y={rectY}
            width={w}
            height={h}
            fill={obj.color || '#33d17a'}
            stroke="#333"
            strokeWidth="1"
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => onObjectMouseEnter?.(idx)}
            onMouseLeave={onObjectMouseLeave}
            style={{
              cursor: isObjectDragging ? 'grabbing' : onObjectDragUpdate ? 'grab' : 'pointer',
            }}
          />
          {obj.text && (
            <text
              x={centerX}
              y={centerY - 10}
              fontSize="12"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#000"
              style={{ pointerEvents: 'none' }}
            >
              {obj.text}
            </text>
          )}
          <text
            data-testid={`freestanding-object-${idx}-dimensions`}
            x={centerX}
            y={obj.text ? centerY + 12 : centerY}
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#888"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onDoubleClick={e => {
              e.stopPropagation();
              onObjectResizeNumeric?.(idx, anchor, width, height);
            }}
          >
            {width}×{height}
          </text>
        </g>
        {showHandles && onObjectResizeStart && (
          <ObjectResizeHandles
            room={virtualRoom}
            objectIndex={idx}
            object={obj}
            absolutePosition={absolutePosition}
            mm={mm}
            onResizeStart={(_roomId, objIdx, corner) => onObjectResizeStart(objIdx, corner)}
            onResizeNumeric={(_roomId, objIdx, corner, w, h) =>
              onObjectResizeNumeric?.(objIdx, corner, w, h)
            }
            onMouseEnter={() => onObjectMouseEnter?.(idx)}
            visible={showHandles}
          />
        )}
      </>
    );
  }
}
