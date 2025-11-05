import { useState, useCallback, useEffect } from 'react';
import type { RoomObject, ResolvedRoom } from '../../types';

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
}

export function FreestandingObjectsRenderer({
  objects,
  roomMap,
  mm,
  onObjectClick,
  onObjectDragUpdate,
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
}

function FreestandingObject({
  obj,
  idx,
  roomMap,
  mm,
  onObjectClick,
  onObjectDragUpdate,
}: FreestandingObjectProps) {
  const [isObjectDragging, setIsObjectDragging] = useState(false);
  const [currentObjX, setCurrentObjX] = useState(obj.x);
  const [currentObjY, setCurrentObjY] = useState(obj.y);
  const [targetRoomId, setTargetRoomId] = useState<string>('freestanding');

  const width = obj.type === 'circle' ? obj.width : obj.width;
  const height = obj.type === 'circle' ? obj.width : obj.height || obj.width;

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
      if (!onObjectClick) return;
      e.stopPropagation();
      onObjectClick(idx);
    },
    [onObjectClick, idx]
  );

  if (obj.type === 'circle') {
    const radius = width / 2;
    const centerX = mm(displayX + radius);
    const centerY = mm(displayY + radius);
    return (
      <g
        className="freestanding-object"
        data-object-index={idx}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{ cursor: onObjectDragUpdate ? 'move' : 'pointer' }}
      >
        <circle
          cx={centerX}
          cy={centerY}
          r={mm(radius)}
          fill={obj.color || '#33d17a'}
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
    const rectX = mm(displayX);
    const rectY = mm(displayY);
    const w = mm(width);
    const h = mm(height);
    const centerX = rectX + w / 2;
    const centerY = rectY + h / 2;
    return (
      <g
        className="freestanding-object"
        data-object-index={idx}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{ cursor: onObjectDragUpdate ? 'move' : 'pointer' }}
      >
        <rect
          x={rectX}
          y={rectY}
          width={w}
          height={h}
          fill={obj.color || '#33d17a'}
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
