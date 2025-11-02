import type { Window, WallPosition, ResolvedRoom } from '../../types';
import { useState, useCallback, useEffect } from 'react';

const WINDOW_THICKNESS = 100; // mm

interface WindowRendererProps {
  window: Window;
  index: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onClick?: (windowIndex: number) => void;
  onDragUpdate?: (windowIndex: number, newRoomId: string, newWall: WallPosition, newOffset: number) => void;
}

export function WindowRenderer({
  window,
  index,
  roomMap,
  mm,
  onClick,
  onDragUpdate,
}: WindowRendererProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(window.offset ?? 0);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [currentWall, setCurrentWall] = useState<WallPosition>('top');

  const [roomId, wallStr = 'top'] = window.room.split(':') as [string, WallPosition];
  const room = roomMap[roomId];
  if (!room) return null;

  const wall = wallStr as WallPosition;

  // Use current values during drag, otherwise use window values
  const activeRoomId = isDragging && currentRoomId ? currentRoomId : roomId;
  const activeWall = isDragging && currentRoomId ? currentWall : wall;
  const activeRoom = roomMap[activeRoomId];
  if (!activeRoom) return null;

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
      if (!onDragUpdate) return;
      e.stopPropagation();
      const { x, y } = screenToMM(e);
      setIsDragging(true);
      setDragStartX(x);
      setDragStartY(y);
      setDragStartOffset(window.offset ?? 0);
      setCurrentOffset(window.offset ?? 0);
    },
    [onDragUpdate, screenToMM, window.offset]
  );

  // Helper to find closest wall to a point
  const findClosestWall = useCallback((room: ResolvedRoom, x: number, y: number): { wall: WallPosition; offset: number } => {
    const distances = [
      { wall: 'top' as WallPosition, dist: Math.abs(y - room.y), offset: x - room.x },
      { wall: 'bottom' as WallPosition, dist: Math.abs(y - (room.y + room.depth)), offset: x - room.x },
      { wall: 'left' as WallPosition, dist: Math.abs(x - room.x), offset: y - room.y },
      { wall: 'right' as WallPosition, dist: Math.abs(x - (room.x + room.width)), offset: y - room.y },
    ];

    const closest = distances.reduce((min, curr) => curr.dist < min.dist ? curr : min);

    // Clamp offset to wall bounds
    let clampedOffset = closest.offset;
    if (closest.wall === 'top' || closest.wall === 'bottom') {
      clampedOffset = Math.max(0, Math.min(clampedOffset, room.width - window.width));
    } else {
      clampedOffset = Math.max(0, Math.min(clampedOffset, room.depth - window.width));
    }

    return { wall: closest.wall, offset: clampedOffset };
  }, [window.width]);

  // Helper to find which room the mouse is over
  const findRoomAtPoint = useCallback((x: number, y: number): ResolvedRoom | null => {
    for (const room of Object.values(roomMap)) {
      if (x >= room.x && x <= room.x + room.width &&
          y >= room.y && y <= room.y + room.depth) {
        return room;
      }
    }
    return null;
  }, [roomMap]);

  // Add global mouse move and mouse up listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

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
      const targetRoom = findRoomAtPoint(x, y);
      if (targetRoom) {
        // Find closest wall of that room
        const { wall: newWall, offset: newOffset } = findClosestWall(targetRoom, x, y);

        setCurrentRoomId(targetRoom.id);
        setCurrentWall(newWall);
        setCurrentOffset(newOffset);
      }
    };

    const handleGlobalMouseUp = () => {
      if (!isDragging || !onDragUpdate) return;
      setIsDragging(false);
      const finalRoomId = currentRoomId || roomId;
      const finalWall = currentRoomId ? currentWall : wall;
      onDragUpdate(index, finalRoomId, finalWall, currentOffset);
    };

    globalThis.window.addEventListener('mousemove', handleGlobalMouseMove);
    globalThis.window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      globalThis.window.removeEventListener('mousemove', handleGlobalMouseMove);
      globalThis.window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, findClosestWall, findRoomAtPoint, onDragUpdate, index, currentOffset, currentRoomId, currentWall, roomId, wall]);

  // Use currentOffset when dragging, otherwise use window.offset
  const activeOffset = isDragging ? currentOffset : (window.offset ?? 0);
  const offset = mm(activeOffset);
  const w = mm(window.width);
  const d = mm(WINDOW_THICKNESS);

  // Calculate position and rotation based on wall
  let posX: number, posY: number, rotation: number;
  let rectX = 0,
    rectY = 0;

  switch (activeWall) {
    case 'left':
      posX = mm(activeRoom.x);
      posY = mm(activeRoom.y) + offset;
      rotation = 90;
      rectX = 0; // Window extends into room (rightward)
      rectY = -d; // Shift up by thickness
      break;

    case 'right':
      posX = mm(activeRoom.x + activeRoom.width);
      posY = mm(activeRoom.y) + offset;
      rotation = 90;
      rectX = 0; // Window extends into room (leftward)
      rectY = 0; // Shift up by thickness
      break;

    case 'top':
      posX = mm(activeRoom.x) + offset;
      posY = mm(activeRoom.y);
      rotation = 0;
      rectX = 0;
      rectY = 0; // Window extends into room (downward)
      break;

    case 'bottom':
      posX = mm(activeRoom.x) + offset;
      posY = mm(activeRoom.y + activeRoom.depth);
      rotation = 0;
      rectX = 0;
      rectY = -d; // Window extends into room (upward)
      break;

    default:
      return null;
  }

  const x = posX;
  const y = posY;

  return (
    <g
      key={`window-${index}`}
      className="window-group"
      data-window-index={index}
      transform={`translate(${x},${y}) rotate(${rotation})`}
      onClick={() => !isDragging && onClick?.(index)}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : onDragUpdate ? 'grab' : 'pointer' }}
    >
      <rect
        x={rectX}
        y={rectY}
        width={w}
        height={d}
        fill="lightblue"
        stroke="#444"
        strokeWidth="2"
      />
    </g>
  );
}
