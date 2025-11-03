import { useState, useCallback, useEffect } from 'react';
import type { Window, WallPosition, ResolvedRoom } from '../../types';

const WINDOW_THICKNESS = 100; // mm
const SNAP_DISTANCE = 300; // mm - distance to snap to walls

interface FreestandingWindowsRendererProps {
  windows: Window[];
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onWindowClick?: (windowIndex: number) => void;
  onWindowDragUpdate?: (windowIndex: number, roomId: string | null, wall: WallPosition | null, offset: number, x: number, y: number) => void;
}

export function FreestandingWindowsRenderer({
  windows,
  roomMap,
  mm,
  onWindowClick,
  onWindowDragUpdate,
}: FreestandingWindowsRendererProps) {
  return (
    <g className="freestanding-windows">
      {windows.map((window, idx) => (
        <FreestandingWindow
          key={`freestanding-window-${idx}`}
          window={window}
          index={idx}
          roomMap={roomMap}
          mm={mm}
          onWindowClick={onWindowClick}
          onWindowDragUpdate={onWindowDragUpdate}
        />
      ))}
    </g>
  );
}

interface FreestandingWindowProps {
  window: Window;
  index: number;
  roomMap: Record<string, ResolvedRoom>;
  mm: (val: number) => number;
  onWindowClick?: (windowIndex: number) => void;
  onWindowDragUpdate?: (windowIndex: number, roomId: string | null, wall: WallPosition | null, offset: number, x: number, y: number) => void;
}

function FreestandingWindow({
  window,
  index,
  roomMap,
  mm,
  onWindowClick,
  onWindowDragUpdate,
}: FreestandingWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentX, setCurrentX] = useState(window.x ?? 0);
  const [currentY, setCurrentY] = useState(window.y ?? 0);
  const [snappedWall, setSnappedWall] = useState<{ roomId: string; wall: WallPosition; offset: number } | null>(null);

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
  const findClosestWall = useCallback((x: number, y: number): { roomId: string; wall: WallPosition; offset: number } | null => {
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onWindowDragUpdate) return;
      e.stopPropagation();
      setIsDragging(true);
    },
    [onWindowDragUpdate]
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
      if (!onWindowDragUpdate) return;
      setIsDragging(false);

      if (snappedWall) {
        // Snap to wall
        onWindowDragUpdate(index, snappedWall.roomId, snappedWall.wall, snappedWall.offset, currentX, currentY);
      } else {
        // Stay freestanding
        onWindowDragUpdate(index, null, null, 0, currentX, currentY);
      }
      setSnappedWall(null);
    };

    globalThis.window.addEventListener('mousemove', handleMouseMove);
    globalThis.window.addEventListener('mouseup', handleMouseUp);

    return () => {
      globalThis.window.removeEventListener('mousemove', handleMouseMove);
      globalThis.window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, currentX, currentY, snappedWall, screenToMM, findClosestWall, onWindowDragUpdate, index]);

  // Only render if this is a freestanding window (has x,y coordinates)
  if (window.x === undefined || window.y === undefined) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWindowClick?.(index);
  };

  const rotation = window.rotation || 0;

  // Display position
  const displayX = isDragging ? currentX : window.x;
  const displayY = isDragging ? currentY : window.y;

  // Render window as a rectangle with panes
  const windowWidth = mm(window.width);
  const windowThickness = mm(WINDOW_THICKNESS);

  return (
    <g
      transform={`translate(${mm(displayX)}, ${mm(displayY)}) rotate(${rotation})`}
      data-window-index={index}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      style={{ cursor: isDragging ? 'grabbing' : onWindowDragUpdate ? 'grab' : 'pointer' }}
    >
      {/* Window frame */}
      <rect
        x={0}
        y={-windowThickness / 2}
        width={windowWidth}
        height={windowThickness}
        fill="lightblue"
        stroke={snappedWall ? '#00ff00' : '#444'}
        strokeWidth={snappedWall ? '3' : '2'}
        className="freestanding-window"
      />

      {/* Snap indicator */}
      {snappedWall && (
        <text
          x={windowWidth / 2}
          y={-windowThickness}
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
