import type { Door, WallPosition, ResolvedRoom } from '../../types';
import { useState, useCallback, useEffect } from 'react';

const DOOR_THICKNESS = 100; // mm

interface DoorRendererProps {
  door: Door;
  index: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onClick?: (doorIndex: number) => void;
  onDragUpdate?: (doorIndex: number, newRoomId: string, newWall: WallPosition, newOffset: number) => void;
}

export function DoorRenderer({
  door,
  index,
  roomMap,
  mm,
  onClick,
  onDragUpdate,
}: DoorRendererProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(door.offset ?? 0);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [currentWall, setCurrentWall] = useState<WallPosition>('left');

  const [roomId, wallStr = 'left'] = door.room.split(':') as [string, WallPosition];
  const room = roomMap[roomId];
  if (!room) return null;

  const wall = wallStr as WallPosition;

  // Use current values during drag, otherwise use door values
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

    // Convert from screen units back to mm
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
      setDragStartOffset(door.offset ?? 0);
      setCurrentOffset(door.offset ?? 0);
    },
    [onDragUpdate, screenToMM, door.offset]
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
      clampedOffset = Math.max(0, Math.min(clampedOffset, room.width - door.width));
    } else {
      clampedOffset = Math.max(0, Math.min(clampedOffset, room.depth - door.width));
    }

    return { wall: closest.wall, offset: clampedOffset };
  }, [door.width]);

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

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, findClosestWall, findRoomAtPoint, onDragUpdate, index, currentOffset, currentRoomId, currentWall, roomId, wall]);

  // Use currentOffset when dragging, otherwise use door.offset
  const activeOffset = isDragging ? currentOffset : (door.offset ?? 0);
  const offset = mm(activeOffset);
  const swing = door.swing || 'inwards-right';
  const w = mm(door.width);
  const d = mm(DOOR_THICKNESS);

  // Check if this is an opening (no door blade)
  // Check both type and swing for backwards compatibility
  const isOpening = door.type === 'opening' || swing === 'opening';

  // Determine if door swings inwards or outwards, and left or right
  const isInwards = swing.startsWith('inwards');
  const isRight = swing.endsWith('right');

  // Calculate position based on wall and offset
  let x: number, y: number;
  let doorRect: { x: number; y: number; width: number; height: number };
  let arcPath: string;

  switch (activeWall) {
    case 'bottom':
      // Bottom wall - door opens into room (upward)
      x = mm(activeRoom.x) + offset;
      y = mm(activeRoom.y + activeRoom.depth);

      if (isInwards) {
        // Door swings into room (upward)
        doorRect = { x: 0, y: -d, width: w, height: d };
        if (isRight) {
          // Hinge on right, arc from right edge to left
          arcPath = `M ${w} ${-d} A ${w} ${w} 0 0 0 0 ${-d - w}`;
        } else {
          // Hinge on left, arc from left edge to right
          arcPath = `M 0 ${-d} A ${w} ${w} 0 0 1 ${w} ${-d - w}`;
        }
      } else {
        // Door swings out of room (downward)
        doorRect = { x: 0, y: 0, width: w, height: d };
        if (isRight) {
          // Hinge on right, arc from right edge outward
          arcPath = `M ${w} 0 A ${w} ${w} 0 0 1 0 ${w}`;
        } else {
          // Hinge on left, arc from left edge outward
          arcPath = `M 0 0 A ${w} ${w} 0 0 0 ${w} ${w}`;
        }
      }
      break;

    case 'top':
      // Top wall - door opens into room (downward)
      x = mm(activeRoom.x) + offset;
      y = mm(activeRoom.y);

      if (isInwards) {
        // Door swings into room (downward)
        doorRect = { x: 0, y: 0, width: w, height: d };
        if (isRight) {
          // Hinge on right, arc from right edge to left
          arcPath = `M ${w} ${d} A ${w} ${w} 0 0 1 0 ${d + w}`;
        } else {
          // Hinge on left, arc from left edge to right
          arcPath = `M 0 ${d} A ${w} ${w} 0 0 0 ${w} ${d + w}`;
        }
      } else {
        // Door swings out of room (upward)
        doorRect = { x: 0, y: -d, width: w, height: d };
        if (isRight) {
          // Hinge on right, arc from right edge outward
          arcPath = `M ${w} ${-d} A ${w} ${w} 0 0 0 0 ${-d - w}`;
        } else {
          // Hinge on left, arc from left edge outward
          arcPath = `M 0 ${-d} A ${w} ${w} 0 0 1 ${w} ${-d - w}`;
        }
      }
      break;

    case 'left':
      // Left wall - door opens into room (rightward)
      x = mm(activeRoom.x);
      y = mm(activeRoom.y) + offset;

      if (isInwards) {
        // Door swings into room (rightward)
        doorRect = { x: 0, y: 0, width: d, height: w };
        if (isRight) {
          // Hinge on bottom, arc from bottom edge upward
          arcPath = `M ${d} ${w} A ${w} ${w} 0 0 0 ${d + w} 0`;
        } else {
          // Hinge on top, arc from top edge downward
          arcPath = `M ${d} 0 A ${w} ${w} 0 0 1 ${d + w} ${w}`;
        }
      } else {
        // Door swings out of room (leftward)
        doorRect = { x: -d, y: 0, width: d, height: w };
        if (isRight) {
          // Hinge on bottom, arc from bottom edge outward
          arcPath = `M ${-d} ${w} A ${w} ${w} 0 0 1 ${-d - w} 0`;
        } else {
          // Hinge on top, arc from top edge outward
          arcPath = `M ${-d} 0 A ${w} ${w} 0 0 0 ${-d - w} ${w}`;
        }
      }
      break;

    case 'right':
      // Right wall - door opens into room (leftward)
      x = mm(activeRoom.x + activeRoom.width);
      y = mm(activeRoom.y) + offset;

      if (isInwards) {
        // Door swings into room (leftward)
        doorRect = { x: -d, y: 0, width: d, height: w };
        if (isRight) {
          // Hinge on bottom, arc from bottom edge upward
          arcPath = `M ${-d} ${w} A ${w} ${w} 0 0 1 ${-d - w} 0`;
        } else {
          // Hinge on top, arc from top edge downward
          arcPath = `M ${-d} 0 A ${w} ${w} 0 0 0 ${-d - w} ${w}`;
        }
      } else {
        // Door swings out of room (rightward)
        doorRect = { x: 0, y: 0, width: d, height: w };
        if (isRight) {
          // Hinge on bottom, arc from bottom edge outward
          arcPath = `M ${d} ${w} A ${w} ${w} 0 0 0 ${d + w} 0`;
        } else {
          // Hinge on top, arc from top edge outward
          arcPath = `M ${d} 0 A ${w} ${w} 0 0 1 ${d + w} ${w}`;
        }
      }
      break;

    default:
      return null;
  }

  return (
    <g
      key={`door-${index}`}
      className="door-group"
      data-door-index={index}
      onClick={() => !isDragging && onClick?.(index)}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : onDragUpdate ? 'grab' : 'pointer' }}
    >
      {/* Door rectangle (always shown) */}
      <rect
        x={x + doorRect.x}
        y={y + doorRect.y}
        width={doorRect.width}
        height={doorRect.height}
        fill="saddlebrown"
        stroke="#333"
        strokeWidth="1"
      />
      {/* Door swing arc (not shown for openings) */}
      {!isOpening && (
        <path
          d={arcPath}
          transform={`translate(${x},${y})`}
          fill="none"
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="4,2"
        />
      )}
    </g>
  );
}
