import type { Door, WallPosition, ResolvedRoom, SwingDirection } from '../../types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { DoorWindowResizeHandles, type ResizeEnd } from './DoorWindowResizeHandles';

const DOOR_THICKNESS = 100; // mm
const SNAP_DISTANCE = 300; // mm - distance to snap to walls
const MIN_DOOR_WIDTH = 400; // mm - minimum door width

// Cycle through swing directions (including 'opening')
const SWING_CYCLE: SwingDirection[] = [
  'inwards-left',
  'inwards-right',
  'outwards-right',
  'outwards-left',
  'opening',
];

function getNextSwing(current: SwingDirection | undefined): SwingDirection {
  if (!current) return 'inwards-left';
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
  onResizeUpdate?: (doorIndex: number, newWidth: number, newOffset: number) => void;
  isFocused?: boolean;
  onFocus?: (doorIndex: number) => void;
}

export function DoorRenderer({
  door,
  index,
  roomMap,
  mm,
  onClick,
  onDragUpdate,
  onSwingUpdate,
  onResizeUpdate,
  isFocused,
  onFocus,
}: DoorRendererProps) {
  const [isDragging, setIsDragging] = useState(false);
  // isHovered kept for potential CSS hover effects via onMouseEnter/Leave
  const [, setIsHovered] = useState(false);

  // Show buttons when focused (via click) - not just on hover
  const showButtons = isFocused && !isDragging;
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

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startWidth: number;
    startOffset: number;
    wall: WallPosition;
    end: ResizeEnd;
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
      if (onSwingUpdate) {
        const newSwing = getNextSwing(door.swing);
        onSwingUpdate(index, newSwing);
      }
    },
    [onSwingUpdate, door.swing, index]
  );

  // Handle resize start
  const handleResizeStart = useCallback(
    (end: ResizeEnd) => {
      if (!onResizeUpdate || !door.room) return;

      const [roomId, wallStr = 'left'] = door.room.split(':') as [string, WallPosition];
      const room = roomMap[roomId];
      if (!room) return;

      setIsResizing(true);

      // Get initial mouse position
      const svgElement = document.querySelector('.floorplan-svg') as SVGSVGElement;
      if (!svgElement) return;

      resizeStateRef.current = {
        startMouseX: 0, // Will be set on first move
        startMouseY: 0,
        startWidth: door.width,
        startOffset: door.offset ?? 0,
        wall: wallStr as WallPosition,
        end,
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeStateRef.current) return;

        const pt = svgElement.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
        const mouseX = svgPt.x * 10; // Convert to mm
        const mouseY = svgPt.y * 10;

        // Initialize start position on first move
        if (resizeStateRef.current.startMouseX === 0 && resizeStateRef.current.startMouseY === 0) {
          resizeStateRef.current.startMouseX = mouseX;
          resizeStateRef.current.startMouseY = mouseY;
          return;
        }

        const { wall, end: resizeEnd } = resizeStateRef.current;
        const isHorizontalWall = wall === 'top' || wall === 'bottom';

        // Calculate delta along the wall direction
        const delta = isHorizontalWall
          ? mouseX - resizeStateRef.current.startMouseX
          : mouseY - resizeStateRef.current.startMouseY;

        let newWidth = resizeStateRef.current.startWidth;
        let newOffset = resizeStateRef.current.startOffset;

        if (resizeEnd === 'start') {
          // Dragging start handle - adjust both offset and width
          newOffset = resizeStateRef.current.startOffset + delta;
          newWidth = resizeStateRef.current.startWidth - delta;
        } else {
          // Dragging end handle - only adjust width
          newWidth = resizeStateRef.current.startWidth + delta;
        }

        // Enforce minimum width
        if (newWidth < MIN_DOOR_WIDTH) {
          if (resizeEnd === 'start') {
            newOffset =
              resizeStateRef.current.startOffset +
              resizeStateRef.current.startWidth -
              MIN_DOOR_WIDTH;
          }
          newWidth = MIN_DOOR_WIDTH;
        }

        // Enforce offset >= 0
        if (newOffset < 0) {
          newWidth = resizeStateRef.current.startWidth + resizeStateRef.current.startOffset;
          newOffset = 0;
        }

        // Enforce wall bounds
        const maxOffset = isHorizontalWall ? room.width : room.depth;
        if (newOffset + newWidth > maxOffset) {
          if (resizeEnd === 'end') {
            newWidth = maxOffset - newOffset;
          } else {
            newOffset = maxOffset - newWidth;
          }
        }

        // Round to reasonable precision
        newWidth = Math.round(newWidth);
        newOffset = Math.round(newOffset);

        onResizeUpdate(index, newWidth, newOffset);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        resizeStateRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [door, index, roomMap, onResizeUpdate]
  );

  // Handle numeric resize (double-click)
  const handleResizeNumeric = useCallback(() => {
    if (!onResizeUpdate || !door.room) return;

    const promptMessage = `Enter new door width in mm (current: ${door.width}mm):`;
    const input = window.prompt(promptMessage, door.width.toString());

    if (input === null) return; // User cancelled

    const newWidth = parseInt(input, 10);
    if (isNaN(newWidth) || newWidth < MIN_DOOR_WIDTH) {
      alert(`Please enter a valid number (minimum ${MIN_DOOR_WIDTH}mm)`);
      return;
    }

    onResizeUpdate(index, newWidth, door.offset ?? 0);
  }, [door, index, onResizeUpdate]);

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
      onClick={() => {
        if (!isDragging) {
          onClick?.(index);
          onFocus?.(index);
        }
      }}
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
      {/* Dimension and offset labels */}
      {!isDragging &&
        (() => {
          const doorWidth = door.width;
          const doorOffset = door.offset ?? 0;
          const isHorizontalWall = activeWall === 'top' || activeWall === 'bottom';
          const offsetArrow = isHorizontalWall ? '→' : '↓';

          // Calculate label positions based on wall
          let labelX: number, labelY: number;
          let offsetLabelX: number, offsetLabelY: number;
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          let offsetTextAnchor: 'start' | 'middle' | 'end' = 'middle';

          switch (activeWall) {
            case 'top':
              // Dimension label above door (outside room)
              labelX = x + doorRect.x + doorRect.width / 2;
              labelY = y + doorRect.y - 8;
              // Offset label to the left of door start
              offsetLabelX = x + doorRect.x - 4;
              offsetLabelY = y + doorRect.y - 8;
              offsetTextAnchor = 'end';
              break;
            case 'bottom':
              // Dimension label below door (outside room)
              labelX = x + doorRect.x + doorRect.width / 2;
              labelY = y + doorRect.y + doorRect.height + 12;
              // Offset label to the left of door start
              offsetLabelX = x + doorRect.x - 4;
              offsetLabelY = y + doorRect.y + doorRect.height + 12;
              offsetTextAnchor = 'end';
              break;
            case 'left':
              // Dimension label to the left of door (outside room)
              labelX = x + doorRect.x - 8;
              labelY = y + doorRect.y + doorRect.height / 2;
              textAnchor = 'end';
              // Offset label above door start
              offsetLabelX = x + doorRect.x - 8;
              offsetLabelY = y + doorRect.y - 4;
              offsetTextAnchor = 'end';
              break;
            case 'right':
              // Dimension label to the right of door (outside room)
              labelX = x + doorRect.x + doorRect.width + 8;
              labelY = y + doorRect.y + doorRect.height / 2;
              textAnchor = 'start';
              // Offset label above door start
              offsetLabelX = x + doorRect.x + doorRect.width + 8;
              offsetLabelY = y + doorRect.y - 4;
              offsetTextAnchor = 'start';
              break;
            default:
              labelX = x + doorRect.x + doorRect.width / 2;
              labelY = y + doorRect.y - 8;
              offsetLabelX = x + doorRect.x - 4;
              offsetLabelY = y + doorRect.y - 8;
          }

          return (
            <>
              {/* Dimension label (width) */}
              <text
                data-testid={`door-${index}-dimensions`}
                x={labelX}
                y={labelY}
                fontSize="9"
                textAnchor={textAnchor}
                dominantBaseline="middle"
                fill="#666"
                pointerEvents="none"
              >
                {doorWidth}
              </text>
              {/* Offset label with direction */}
              {doorOffset > 0 && (
                <text
                  data-testid={`door-${index}-offset`}
                  x={offsetLabelX}
                  y={offsetLabelY}
                  fontSize="8"
                  textAnchor={offsetTextAnchor}
                  dominantBaseline="middle"
                  fill="#888"
                  pointerEvents="none"
                >
                  {offsetArrow}
                  {doorOffset}
                </text>
              )}
            </>
          );
        })()}
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
      {/* Toggle orientation button (shown when focused, not when dragging/resizing) */}
      {showButtons && !isResizing && onSwingUpdate && (
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
      {/* Resize handles (shown when focused, not when dragging) */}
      {showButtons && onResizeUpdate && (
        <DoorWindowResizeHandles
          x={x + doorRect.x}
          y={y + doorRect.y}
          width={activeWall === 'left' || activeWall === 'right' ? doorRect.height : doorRect.width}
          thickness={
            activeWall === 'left' || activeWall === 'right' ? doorRect.width : doorRect.height
          }
          wall={activeWall}
          onResizeStart={handleResizeStart}
          onResizeNumeric={handleResizeNumeric}
          onMouseEnter={() => setIsHovered(true)}
          visible={true}
        />
      )}
    </g>
  );
}
