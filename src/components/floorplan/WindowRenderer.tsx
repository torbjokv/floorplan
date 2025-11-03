import type { Window, WallPosition, ResolvedRoom } from '../../types';
import { useState, useCallback, useEffect } from 'react';

const WINDOW_THICKNESS = 100; // mm
const SNAP_DISTANCE = 300; // mm - distance to snap to walls

interface WindowRendererProps {
  window: Window;
  index: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onClick?: (windowIndex: number) => void;
  onDragUpdate?: (windowIndex: number, roomId: string | null, wall: WallPosition | null, offset: number, x: number, y: number) => void;
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
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(window.offset ?? 0);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentWall, setCurrentWall] = useState<WallPosition | null>(null);
  const [snappedWall, setSnappedWall] = useState<{ roomId: string; wall: WallPosition; offset: number } | null>(null);

  const [roomId, wallStr = 'left'] = window.room!.split(':') as [string, WallPosition];
  const wall = wallStr as WallPosition;

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
      setCurrentX(x);
      setCurrentY(y);
      setCurrentOffset(window.offset ?? 0);
    },
    [onDragUpdate, screenToMM, window.offset]
  );

  // Helper to find closest wall across all rooms (for snapping)
  const findClosestWallToSnap = useCallback((x: number, y: number): { roomId: string; wall: WallPosition; offset: number } | null => {
    let closest: { roomId: string; wall: WallPosition; offset: number; distance: number } | null = null;

    for (const room of Object.values(roomMap)) {
      if (room.id === 'zeropoint') continue;

      // Check all four walls
      const walls = [
        { wall: 'top' as WallPosition, dist: Math.abs(y - room.y), offset: x - room.x, maxOffset: room.width },
        { wall: 'bottom' as WallPosition, dist: Math.abs(y - (room.y + room.depth)), offset: x - room.x, maxOffset: room.width },
        { wall: 'left' as WallPosition, dist: Math.abs(x - room.x), offset: y - room.y, maxOffset: room.depth },
        { wall: 'right' as WallPosition, dist: Math.abs(x - (room.x + room.width)), offset: y - room.y, maxOffset: room.depth },
      ];

      for (const w of walls) {
        if (w.dist < SNAP_DISTANCE && w.offset >= 0 && w.offset <= w.maxOffset - window.width) {
          if (!closest || w.dist < closest.distance) {
            closest = {
              roomId: room.id,
              wall: w.wall,
              offset: Math.max(0, Math.min(w.offset, w.maxOffset - window.width)),
              distance: w.dist,
            };
          }
        }
      }
    }

    return closest;
  }, [roomMap, window.width]);

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

      setCurrentX(x);
      setCurrentY(y);

      // Check for wall snap
      const snap = findClosestWallToSnap(x, y);
      setSnappedWall(snap);

      if (snap) {
        setCurrentRoomId(snap.roomId);
        setCurrentWall(snap.wall);
        setCurrentOffset(snap.offset);
      } else {
        setCurrentRoomId(null);
        setCurrentWall(null);
      }
    };

    const handleGlobalMouseUp = () => {
      if (!isDragging || !onDragUpdate) return;
      setIsDragging(false);

      if (snappedWall) {
        // Snap to wall
        onDragUpdate(index, snappedWall.roomId, snappedWall.wall, snappedWall.offset, currentX, currentY);
      } else {
        // Go freestanding
        onDragUpdate(index, null, null, 0, currentX, currentY);
      }

      setSnappedWall(null);
      setCurrentRoomId(null);
      setCurrentWall(null);
    };

    globalThis.window.addEventListener('mousemove', handleGlobalMouseMove);
    globalThis.window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      globalThis.window.removeEventListener('mousemove', handleGlobalMouseMove);
      globalThis.window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, findClosestWallToSnap, onDragUpdate, index, currentX, currentY, snappedWall]);

  // Use current values during drag, otherwise use window values
  const activeRoomId = isDragging && currentRoomId ? currentRoomId : roomId;
  const activeWall = isDragging && currentWall ? currentWall : wall;
  const activeRoom = roomMap[activeRoomId];

  // Early return after all hooks
  const room = roomMap[roomId];
  if (!room || !activeRoom) return null;

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
        stroke={snappedWall ? '#00ff00' : '#444'}
        strokeWidth={snappedWall ? '3' : '2'}
      />
    </g>
  );
}
