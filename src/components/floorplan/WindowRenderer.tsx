import type { Window, WallPosition, ResolvedRoom } from '../../types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { DoorWindowResizeHandles, type ResizeEnd } from './DoorWindowResizeHandles';

const WINDOW_THICKNESS = 100; // mm
const SNAP_DISTANCE = 300; // mm - distance to snap to walls
const MIN_WINDOW_WIDTH = 300; // mm - minimum window width

interface WindowRendererProps {
  window: Window;
  index: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onClick?: (windowIndex: number) => void;
  onDragUpdate?: (
    windowIndex: number,
    roomId: string | null,
    wall: WallPosition | null,
    offset: number,
    x: number,
    y: number
  ) => void;
  onResizeUpdate?: (windowIndex: number, newWidth: number, newOffset: number) => void;
}

export function WindowRenderer({
  window,
  index,
  roomMap,
  mm,
  onClick,
  onDragUpdate,
  onResizeUpdate,
}: WindowRendererProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(window.offset ?? 0);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentWall, setCurrentWall] = useState<WallPosition | null>(null);
  const [snappedWall, setSnappedWall] = useState<{
    roomId: string;
    wall: WallPosition;
    offset: number;
  } | null>(null);

  // Resize state
  const [_isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startWidth: number;
    startOffset: number;
    wall: WallPosition;
  } | null>(null);

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
    },
    [roomMap, window.width]
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

    globalThis.window.addEventListener('mousemove', handleGlobalMouseMove);
    globalThis.window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      globalThis.window.removeEventListener('mousemove', handleGlobalMouseMove);
      globalThis.window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, findClosestWallToSnap, onDragUpdate, index, currentX, currentY, snappedWall]);

  // Handle resize start
  const handleResizeStart = useCallback(
    (end: ResizeEnd) => {
      if (!onResizeUpdate || !window.room) return;

      const [roomId, wallStr = 'left'] = window.room.split(':') as [string, WallPosition];
      const room = roomMap[roomId];
      if (!room) return;

      setIsResizing(true);

      // Get initial mouse position
      const svgElement = document.querySelector('.floorplan-svg') as SVGSVGElement;
      if (!svgElement) return;

      resizeStateRef.current = {
        startMouseX: 0, // Will be set on first move
        startMouseY: 0,
        startWidth: window.width,
        startOffset: window.offset ?? 0,
        wall: wallStr as WallPosition,
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

        const wall = resizeStateRef.current.wall;
        const isHorizontalWall = wall === 'top' || wall === 'bottom';

        // Calculate delta along the wall direction
        const delta = isHorizontalWall
          ? mouseX - resizeStateRef.current.startMouseX
          : mouseY - resizeStateRef.current.startMouseY;

        let newWidth = resizeStateRef.current.startWidth;
        let newOffset = resizeStateRef.current.startOffset;

        if (end === 'start') {
          // Dragging start handle - adjust both offset and width
          newOffset = resizeStateRef.current.startOffset + delta;
          newWidth = resizeStateRef.current.startWidth - delta;
        } else {
          // Dragging end handle - only adjust width
          newWidth = resizeStateRef.current.startWidth + delta;
        }

        // Enforce minimum width
        if (newWidth < MIN_WINDOW_WIDTH) {
          if (end === 'start') {
            newOffset =
              resizeStateRef.current.startOffset +
              resizeStateRef.current.startWidth -
              MIN_WINDOW_WIDTH;
          }
          newWidth = MIN_WINDOW_WIDTH;
        }

        // Enforce offset >= 0
        if (newOffset < 0) {
          newWidth = resizeStateRef.current.startWidth + resizeStateRef.current.startOffset;
          newOffset = 0;
        }

        // Enforce wall bounds
        const maxOffset = isHorizontalWall ? room.width : room.depth;
        if (newOffset + newWidth > maxOffset) {
          if (end === 'end') {
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
    [window, index, roomMap, onResizeUpdate]
  );

  // Handle numeric resize (double-click)
  const handleResizeNumeric = useCallback(() => {
    if (!onResizeUpdate || !window.room) return;

    const promptMessage = `Enter new window width in mm (current: ${window.width}mm):`;
    const input = globalThis.window.prompt(promptMessage, window.width.toString());

    if (input === null) return; // User cancelled

    const newWidth = parseInt(input, 10);
    if (isNaN(newWidth) || newWidth < MIN_WINDOW_WIDTH) {
      alert(`Please enter a valid number (minimum ${MIN_WINDOW_WIDTH}mm)`);
      return;
    }

    onResizeUpdate(index, newWidth, window.offset ?? 0);
  }, [window, index, onResizeUpdate]);

  // Only render wall-attached windows in this component
  // Freestanding windows are handled by FreestandingWindowsRenderer
  if (!window.room) return null;

  const [roomId, wallStr = 'left'] = window.room.split(':') as [string, WallPosition];
  const wall = wallStr as WallPosition;

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

  // If dragging with no snap, show at cursor position (freestanding preview)
  if (isDragging && !snappedWall) {
    posX = mm(currentX);
    posY = mm(currentY);
    rotation = 0;
    rectX = 0;
    rectY = -d / 2; // Center vertically
  } else {
    // Wall-attached positioning
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      {/* Resize handles (shown on hover, not when dragging) */}
      {isHovered && !isDragging && onResizeUpdate && (
        <DoorWindowResizeHandles
          x={rectX}
          y={rectY}
          width={w}
          thickness={d}
          wall={activeWall}
          rotation={rotation}
          onResizeStart={handleResizeStart}
          onResizeNumeric={handleResizeNumeric}
          onMouseEnter={() => setIsHovered(true)}
          visible={true}
        />
      )}
    </g>
  );
}
