import type { ResolvedRoom, Anchor } from '../../types';

interface DragState {
  roomId: string;
  dragType: 'corner' | 'center';
  anchor?: Anchor;
  startMouseX: number;
  startMouseY: number;
  startRoomX: number;
  startRoomY: number;
}

interface CornerHighlight {
  roomId: string;
  corner: Anchor;
}

interface CornerHighlightsProps {
  roomMap: Record<string, ResolvedRoom>;
  hoveredCorner: CornerHighlight | null;
  dragState: DragState | null;
  snapTarget: CornerHighlight | null;
  mm: (val: number) => number;
  getCorner: (room: ResolvedRoom, corner: Anchor) => { x: number; y: number };
  dragOffset?: { x: number; y: number } | null;
}

// Helper function to create quarter-circle path
function getQuarterCirclePath(
  cornerX: number,
  cornerY: number,
  anchor: Anchor,
  radius: number,
  mm: (val: number) => number
): string {
  const r = mm(radius);
  const cx = mm(cornerX);
  const cy = mm(cornerY);

  switch (anchor) {
    case 'top-left':
      // Arc from right to bottom
      return `M ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy + r} L ${cx} ${cy} Z`;
    case 'top-right':
      // Arc from left to bottom
      return `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy + r} L ${cx} ${cy} Z`;
    case 'bottom-left':
      // Arc from right to top
      return `M ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy - r} L ${cx} ${cy} Z`;
    case 'bottom-right':
      // Arc from left to top
      return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r} L ${cx} ${cy} Z`;
  }
}

export function CornerHighlights({
  roomMap,
  hoveredCorner,
  dragState,
  snapTarget,
  mm,
  getCorner,
  dragOffset,
}: CornerHighlightsProps) {
  const highlights = [];

  // When dragging, show only the grabbed corner
  if (dragState && dragState.anchor) {
    const room = roomMap[dragState.roomId];
    if (room) {
      const corner = getCorner(room, dragState.anchor);

      // Apply drag offset
      let cornerX = corner.x;
      let cornerY = corner.y;
      if (dragOffset) {
        cornerX += dragOffset.x;
        cornerY += dragOffset.y;
      }

      const path = getQuarterCirclePath(cornerX, cornerY, dragState.anchor, 600, mm);

      highlights.push(
        <path
          key={`corner-${dragState.roomId}-${dragState.anchor}`}
          d={path}
          fill="rgba(100, 108, 255, 0.5)"
          stroke="#646cff"
          strokeWidth="3"
          pointerEvents="none"
        />
      );
    }
  }
  // When hovering (not dragging), show only the single hovered corner
  else if (hoveredCorner) {
    const room = roomMap[hoveredCorner.roomId];
    if (room) {
      const corner = getCorner(room, hoveredCorner.corner);
      const path = getQuarterCirclePath(corner.x, corner.y, hoveredCorner.corner, 600, mm);

      highlights.push(
        <path
          key={`corner-${hoveredCorner.roomId}-${hoveredCorner.corner}`}
          d={path}
          fill="rgba(100, 108, 255, 0.5)"
          stroke="#646cff"
          strokeWidth="3"
          pointerEvents="none"
        />
      );
    }
  }

  // Render snap target
  if (snapTarget) {
    const room = roomMap[snapTarget.roomId];
    if (room) {
      const corner = getCorner(room, snapTarget.corner);
      highlights.push(
        <circle
          key="snap"
          cx={mm(corner.x)}
          cy={mm(corner.y)}
          r={mm(250)}
          fill="rgba(76, 175, 80, 0.3)"
          stroke="#4caf50"
          strokeWidth="3"
          pointerEvents="none"
        />
      );
    }
  }

  return <>{highlights}</>;
}
