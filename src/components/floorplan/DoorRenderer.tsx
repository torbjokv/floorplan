import type { Door, WallPosition, ResolvedRoom, SwingDirection } from '../../types';
import { useState, useCallback, useEffect } from 'react';

const DOOR_THICKNESS = 100; // mm
const SNAP_DISTANCE = 300; // mm - distance to snap to walls

// Cycle through swing directions (excluding 'opening')
const SWING_CYCLE: SwingDirection[] = [
  'inwards-left',
  'inwards-right',
  'outwards-right',
  'outwards-left',
];

function getNextSwing(current: SwingDirection | undefined): SwingDirection {
  if (!current || current === 'opening') return 'inwards-left';
  const currentIndex = SWING_CYCLE.indexOf(current);
  if (currentIndex === -1) return 'inwards-left';
  return SWING_CYCLE[(currentIndex + 1) % SWING_CYCLE.length];
}

interface DoorRendererProps {
  door: Door;
  index: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onClick?: (doorIndex: number) => void;
  onDragUpdate?: (
    doorIndex: number,
    roomId: string | null,
    wall: WallPosition | null,
    offset: number,
    x: number,
    y: number
  ) => void;
  onSwingUpdate?: (doorIndex: number, newSwing: SwingDirection) => void;
}

export function DoorRenderer({
  door,
  index,
  roomMap,
  mm,
  onClick,
  onDragUpdate,
  onSwingUpdate,
}: DoorRendererProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(door.offset ?? 0);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentWall, setCurrentWall] = useState<WallPosition | null>(null);
  const [snappedWall, setSnappedWall] = useState<{
    roomId: string;
    wall: WallPosition;
    offset: number;
  } | null>(null);

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
      setCurrentX(x);
      setCurrentY(y);
      setCurrentOffset(door.offset ?? 0);
    },
    [onDragUpdate, screenToMM, door.offset]
  );

  // Helper to find closest wall across all rooms (for snapping)
  const findClosestWallToSnap = useCallback(
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
        onDragUpdate(
          index,
          snappedWall.roomId,
          snappedWall.wall,
          snappedWall.offset,
          currentX,
          currentY
        );
      } else {
        // Go freestanding
        onDragUpdate(index, null, null, 0, currentX, currentY);
      }

      setSnappedWall(null);
      setCurrentRoomId(null);
      setCurrentWall(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, findClosestWallToSnap, onDragUpdate, index, currentX, currentY, snappedWall]);

  // Handle toggle button click (must be before early returns for hooks rules)
  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const swing = door.swing || 'inwards-right';
      const isOpening = door.type === 'opening' || swing === 'opening';
      if (onSwingUpdate && !isOpening) {
        const newSwing = getNextSwing(door.swing);
        onSwingUpdate(index, newSwing);
      }
    },
    [onSwingUpdate, door.swing, door.type, index]
  );

  // Only render wall-attached doors in this component
  // Freestanding doors are handled by FreestandingDoorsRenderer
  if (!door.room) return null;

  const [roomId, wallStr = 'left'] = door.room.split(':') as [string, WallPosition];
  const room = roomMap[roomId];
  if (!room) return null;

  const wall = wallStr as WallPosition;

  // Use current values when dragging, otherwise use door values
  const activeRoomId = isDragging && currentRoomId ? currentRoomId : roomId;
  const activeWall = isDragging && currentWall ? currentWall : wall;
  const activeOffset = isDragging ? currentOffset : (door.offset ?? 0);
  const activeRoom = roomMap[activeRoomId];

  if (!activeRoom) return null;

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

  // If dragging with no snap, show at cursor position (freestanding preview)
  if (isDragging && !snappedWall) {
    x = mm(currentX);
    y = mm(currentY);
    doorRect = { x: 0, y: -d / 2, width: w, height: d };
    arcPath = ''; // No arc for freestanding preview
  } else {
    // Wall-attached positioning
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
  }

  // Calculate toggle button position (centered on door)
  const toggleButtonSize = 16;
  const toggleButtonX = x + doorRect.x + doorRect.width / 2 - toggleButtonSize / 2;
  const toggleButtonY = y + doorRect.y + doorRect.height / 2 - toggleButtonSize / 2;

  return (
    <g
      key={`door-${index}`}
      className="door-group"
      data-door-index={index}
      onClick={() => !isDragging && onClick?.(index)}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: isDragging ? 'grabbing' : onDragUpdate ? 'grab' : 'pointer' }}
    >
      {/* Door rectangle (always shown) */}
      <rect
        x={x + doorRect.x}
        y={y + doorRect.y}
        width={doorRect.width}
        height={doorRect.height}
        fill="saddlebrown"
        stroke={snappedWall ? '#00ff00' : '#333'}
        strokeWidth={snappedWall ? '3' : '1'}
      />
      {/* Door swing arc (not shown for openings or freestanding preview) */}
      {!isOpening && arcPath && (
        <path
          d={arcPath}
          transform={`translate(${x},${y})`}
          fill="none"
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="4,2"
        />
      )}
      {/* Toggle orientation button (shown on hover, not for openings or when dragging) */}
      {isHovered && !isDragging && !isOpening && onSwingUpdate && (
        <g
          data-testid="door-toggle-orientation"
          onClick={handleToggleClick}
          onMouseDown={e => e.stopPropagation()}
          style={{ cursor: 'pointer' }}
        >
          {/* Button background */}
          <circle
            cx={toggleButtonX + toggleButtonSize / 2}
            cy={toggleButtonY + toggleButtonSize / 2}
            r={toggleButtonSize / 2 + 2}
            fill="white"
            stroke="#4caf50"
            strokeWidth="2"
          />
          {/* Rotate icon (simple circular arrow) */}
          <path
            d={`M ${toggleButtonX + 4} ${toggleButtonY + toggleButtonSize / 2}
                A ${toggleButtonSize / 2 - 4} ${toggleButtonSize / 2 - 4} 0 1 1
                ${toggleButtonX + toggleButtonSize / 2} ${toggleButtonY + 4}`}
            fill="none"
            stroke="#4caf50"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Arrow head */}
          <path
            d={`M ${toggleButtonX + toggleButtonSize / 2 - 3} ${toggleButtonY + 2}
                L ${toggleButtonX + toggleButtonSize / 2} ${toggleButtonY + 4}
                L ${toggleButtonX + toggleButtonSize / 2 + 3} ${toggleButtonY + 2}`}
            fill="none"
            stroke="#4caf50"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </g>
  );
}
