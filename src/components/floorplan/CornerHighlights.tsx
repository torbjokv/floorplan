import type { ResolvedRoom, Anchor } from '../../types';

interface DragState {
  roomId: string;
  dragType: 'corner' | 'center';
  anchor?: Anchor;
  startMouseX: number;
  startMouseY: number;
  startRoomX: number;
  startRoomY: number;
  partId?: string;
  parentRoomId?: string;
}

interface CornerHighlight {
  roomId: string;
  corner: Anchor;
  partId?: string; // If set, this is a part corner
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
    // For parts, use the part's resolved position; for rooms, use the room
    const targetId = dragState.partId || dragState.roomId;
    const target = roomMap[targetId];
    if (target) {
      const corner = getCorner(target, dragState.anchor);

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
          key={`corner-${targetId}-${dragState.anchor}`}
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
    // For parts, use the part's resolved position; for rooms, use the room
    const targetId = hoveredCorner.partId || hoveredCorner.roomId;
    const target = roomMap[targetId];
    if (target) {
      const corner = getCorner(target, hoveredCorner.corner);
      const path = getQuarterCirclePath(corner.x, corner.y, hoveredCorner.corner, 600, mm);

      highlights.push(
        <path
          key={`corner-${targetId}-${hoveredCorner.corner}`}
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
    // For part snap targets, use the part's resolved position
    const targetId = snapTarget.partId || snapTarget.roomId;
    const target = roomMap[targetId];
    if (target) {
      const corner = getCorner(target, snapTarget.corner);
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
