import { useState, useCallback, useEffect } from 'react';
import type { Door, WallPosition, ResolvedRoom } from '../../types';

const DOOR_THICKNESS = 100; // mm
const SNAP_DISTANCE = 300; // mm - distance to snap to walls

interface FreestandingDoorsRendererProps {
  doors: Door[];
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onDoorClick?: (doorIndex: number) => void;
  onDoorDragUpdate?: (
    doorIndex: number,
    roomId: string | null,
    wall: WallPosition | null,
    offset: number,
    x: number,
    y: number
  ) => void;
}

export function FreestandingDoorsRenderer({
  doors,
  roomMap,
  mm,
  onDoorClick,
  onDoorDragUpdate,
}: FreestandingDoorsRendererProps) {
  return (
    <g className="freestanding-doors">
      {doors.map((door, idx) => (
        <FreestandingDoor
          key={`freestanding-door-${idx}`}
          door={door}
          index={idx}
          roomMap={roomMap}
          mm={mm}
          onDoorClick={onDoorClick}
          onDoorDragUpdate={onDoorDragUpdate}
        />
      ))}
    </g>
  );
}

interface FreestandingDoorProps {
  door: Door;
  index: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onDoorClick?: (doorIndex: number) => void;
  onDoorDragUpdate?: (
    doorIndex: number,
    roomId: string | null,
    wall: WallPosition | null,
    offset: number,
    x: number,
    y: number
  ) => void;
}

function FreestandingDoor({
  door,
  index,
  roomMap,
  mm,
  onDoorClick,
  onDoorDragUpdate,
}: FreestandingDoorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentX, setCurrentX] = useState(door.x ?? 0);
  const [currentY, setCurrentY] = useState(door.y ?? 0);
  const [snappedWall, setSnappedWall] = useState<{
    roomId: string;
    wall: WallPosition;
    offset: number;
  } | null>(null);

  // Convert SVG screen coordinates to mm
  const screenToMM = useCallback((e: MouseEvent): { x: number; y: number } => {
    const svg = document.querySelector('.floorplan-svg') as SVGSVGElement;
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

  // Find closest wall to snap to
  const findClosestWall = useCallback(
    (x: number, y: number): { roomId: string; wall: WallPosition; offset: number } | null => {
      let closest: { roomId: string; wall: WallPosition; offset: number; distance: number } | null =
        null;

      for (const room of Object.values(roomMap)) {
        if (room.id === 'zeropoint') continue;

        // Check all four walls
        const walls = [
          {
            wall: 'top' as WallPosition,
            dist: Math.abs(y - room.y),
            offset: x - room.x,
            maxOffset: room.width,
          },
          {
            wall: 'bottom' as WallPosition,
            dist: Math.abs(y - (room.y + room.depth)),
            offset: x - room.x,
            maxOffset: room.width,
          },
          {
            wall: 'left' as WallPosition,
            dist: Math.abs(x - room.x),
            offset: y - room.y,
            maxOffset: room.depth,
          },
          {
            wall: 'right' as WallPosition,
            dist: Math.abs(x - (room.x + room.width)),
            offset: y - room.y,
            maxOffset: room.depth,
          },
        ];

        for (const w of walls) {
          if (w.dist < SNAP_DISTANCE && w.offset >= 0 && w.offset <= w.maxOffset - door.width) {
            if (!closest || w.dist < closest.distance) {
              closest = {
                roomId: room.id,
                wall: w.wall,
                offset: Math.max(0, Math.min(w.offset, w.maxOffset - door.width)),
                distance: w.dist,
              };
            }
          }
        }
      }

      return closest;
    },
    [roomMap, door.width]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onDoorDragUpdate) return;
      e.stopPropagation();
      setIsDragging(true);
    },
    [onDoorDragUpdate]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { x, y } = screenToMM(e);
      setCurrentX(x);
      setCurrentY(y);

      // Check for wall snap
      const snap = findClosestWall(x, y);
      setSnappedWall(snap);
    };

    const handleMouseUp = () => {
      if (!onDoorDragUpdate) return;
      setIsDragging(false);

      if (snappedWall) {
        // Snap to wall
        onDoorDragUpdate(
          index,
          snappedWall.roomId,
          snappedWall.wall,
          snappedWall.offset,
          currentX,
          currentY
        );
      } else {
        // Stay freestanding
        onDoorDragUpdate(index, null, null, 0, currentX, currentY);
      }
      setSnappedWall(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    currentX,
    currentY,
    snappedWall,
    screenToMM,
    findClosestWall,
    onDoorDragUpdate,
    index,
  ]);

  // Only render if this is a freestanding door (has x,y coordinates)
  if (door.x === undefined || door.y === undefined) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoorClick?.(index);
  };

  const rotation = door.rotation || 0;

  // Display position
  const displayX = isDragging ? currentX : door.x;
  const displayY = isDragging ? currentY : door.y;

  // Render door as a rectangle (similar to wall-attached doors)
  const doorWidth = mm(door.width);
  const doorThickness = mm(DOOR_THICKNESS);

  return (
    <g
      transform={`translate(${mm(displayX)}, ${mm(displayY)}) rotate(${rotation})`}
      data-door-index={index}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : onDoorDragUpdate ? 'grab' : 'pointer' }}
    >
      {/* Door opening */}
      <rect
        x={0}
        y={-doorThickness / 2}
        width={doorWidth}
        height={doorThickness}
        fill="saddlebrown"
        stroke={snappedWall ? '#00ff00' : '#333'}
        strokeWidth={snappedWall ? '3' : '2'}
        className="freestanding-door"
      />

      {/* Snap indicator */}
      {snappedWall && (
        <text
          x={doorWidth / 2}
          y={-doorThickness}
          fontSize="10"
          textAnchor="middle"
          fill="#00ff00"
          style={{ pointerEvents: 'none' }}
        >
          Snap to {snappedWall.roomId}:{snappedWall.wall}
        </text>
      )}
    </g>
  );
}
