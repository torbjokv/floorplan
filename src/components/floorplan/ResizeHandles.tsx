import type { ResolvedRoom } from '../../types';

interface ResizeHandlesProps {
  room: ResolvedRoom;
  mm: (val: number) => number;
  onResizeStart?: (roomId: string, edge: 'width' | 'depth') => void;
}

const HANDLE_SIZE = 20; // pixels
const HANDLE_COLOR = '#4a90e2';
const HANDLE_HOVER_COLOR = '#357abd';

export function ResizeHandles({ room, mm, onResizeStart }: ResizeHandlesProps) {
  // Right edge handle (for width)
  const rightHandleX = mm(room.x + room.width) - HANDLE_SIZE / 2;
  const rightHandleY = mm(room.y + room.depth / 2) - HANDLE_SIZE / 2;

  // Bottom edge handle (for depth)
  const bottomHandleX = mm(room.x + room.width / 2) - HANDLE_SIZE / 2;
  const bottomHandleY = mm(room.y + room.depth) - HANDLE_SIZE / 2;

  return (
    <g className="resize-handles">
      {/* Right edge handle */}
      <rect
        x={rightHandleX}
        y={rightHandleY}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill={HANDLE_COLOR}
        stroke="#fff"
        strokeWidth="2"
        rx="3"
        className="resize-handle resize-handle-width"
        style={{ cursor: 'ew-resize' }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart?.(room.id, 'width');
        }}
      />

      {/* Bottom edge handle */}
      <rect
        x={bottomHandleX}
        y={bottomHandleY}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill={HANDLE_COLOR}
        stroke="#fff"
        strokeWidth="2"
        rx="3"
        className="resize-handle resize-handle-depth"
        style={{ cursor: 'ns-resize' }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart?.(room.id, 'depth');
        }}
      />
    </g>
  );
}
