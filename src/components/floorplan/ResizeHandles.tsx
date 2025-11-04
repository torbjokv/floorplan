import type { ResolvedRoom } from '../../types';

type ResizeEdge = 'left' | 'right' | 'top' | 'bottom';

interface ResizeHandlesProps {
  room: ResolvedRoom;
  mm: (val: number) => number;
  onResizeStart?: (roomId: string, edge: ResizeEdge) => void;
  onResizeNumeric?: (roomId: string, edge: ResizeEdge, currentValue: number) => void;
  onMouseEnter?: () => void;
  visible?: boolean;
}

const HANDLE_SIZE = 12; // pixels - visual size
const HANDLE_HITBOX_SIZE = 40; // pixels - larger clickable area
const HANDLE_COLOR = '#4a90e2';

export function ResizeHandles({
  room,
  mm,
  onResizeStart,
  onResizeNumeric,
  onMouseEnter,
  visible = true,
}: ResizeHandlesProps) {
  if (!visible) return null;

  // Calculate handle positions at the middle of each edge
  const leftHandleX = mm(room.x) - HANDLE_SIZE / 2;
  const leftHandleY = mm(room.y + room.depth / 2) - HANDLE_SIZE / 2;

  const rightHandleX = mm(room.x + room.width) - HANDLE_SIZE / 2;
  const rightHandleY = mm(room.y + room.depth / 2) - HANDLE_SIZE / 2;

  const topHandleX = mm(room.x + room.width / 2) - HANDLE_SIZE / 2;
  const topHandleY = mm(room.y) - HANDLE_SIZE / 2;

  const bottomHandleX = mm(room.x + room.width / 2) - HANDLE_SIZE / 2;
  const bottomHandleY = mm(room.y + room.depth) - HANDLE_SIZE / 2;

  return (
    <g
      className="resize-handles"
      data-room-id={`${room.id}-resize-handles`}
      onMouseEnter={onMouseEnter}
    >
      {/* Left edge handle */}
      <g>
        {/* Visible handle */}
        <rect
          x={leftHandleX}
          y={leftHandleY}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill={HANDLE_COLOR}
          stroke="#fff"
          strokeWidth="2"
          rx="3"
          className="resize-handle resize-handle-left"
          pointerEvents="none"
        />
        {/* Invisible larger hitbox */}
        <rect
          data-testid={`resize-handle-${room.id}-left`}
          x={mm(room.x) - HANDLE_HITBOX_SIZE / 2}
          y={mm(room.y + room.depth / 2) - HANDLE_HITBOX_SIZE / 2}
          width={HANDLE_HITBOX_SIZE}
          height={HANDLE_HITBOX_SIZE}
          fill="transparent"
          cursor="ew-resize"
          className="resize-handle-hitbox"
          onMouseDown={e => {
            e.stopPropagation();
            onResizeStart?.(room.id, 'left');
          }}
          onDoubleClick={e => {
            e.stopPropagation();
            onResizeNumeric?.(room.id, 'left', room.width);
          }}
        />
      </g>

      {/* Right edge handle */}
      <g>
        <rect
          x={rightHandleX}
          y={rightHandleY}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill={HANDLE_COLOR}
          stroke="#fff"
          strokeWidth="2"
          rx="3"
          className="resize-handle resize-handle-right"
          pointerEvents="none"
        />
        <rect
          data-testid={`resize-handle-${room.id}-right`}
          x={mm(room.x + room.width) - HANDLE_HITBOX_SIZE / 2}
          y={mm(room.y + room.depth / 2) - HANDLE_HITBOX_SIZE / 2}
          width={HANDLE_HITBOX_SIZE}
          height={HANDLE_HITBOX_SIZE}
          fill="transparent"
          cursor="ew-resize"
          className="resize-handle-hitbox"
          onMouseDown={e => {
            e.stopPropagation();
            onResizeStart?.(room.id, 'right');
          }}
          onDoubleClick={e => {
            e.stopPropagation();
            onResizeNumeric?.(room.id, 'right', room.width);
          }}
        />
      </g>

      {/* Top edge handle */}
      <g>
        <rect
          x={topHandleX}
          y={topHandleY}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill={HANDLE_COLOR}
          stroke="#fff"
          strokeWidth="2"
          rx="3"
          className="resize-handle resize-handle-top"
          pointerEvents="none"
        />
        <rect
          data-testid={`resize-handle-${room.id}-top`}
          x={mm(room.x + room.width / 2) - HANDLE_HITBOX_SIZE / 2}
          y={mm(room.y) - HANDLE_HITBOX_SIZE / 2}
          width={HANDLE_HITBOX_SIZE}
          height={HANDLE_HITBOX_SIZE}
          fill="transparent"
          cursor="ns-resize"
          className="resize-handle-hitbox"
          onMouseDown={e => {
            e.stopPropagation();
            onResizeStart?.(room.id, 'top');
          }}
          onDoubleClick={e => {
            e.stopPropagation();
            onResizeNumeric?.(room.id, 'top', room.depth);
          }}
        />
      </g>

      {/* Bottom edge handle */}
      <g>
        <rect
          x={bottomHandleX}
          y={bottomHandleY}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill={HANDLE_COLOR}
          stroke="#fff"
          strokeWidth="2"
          rx="3"
          className="resize-handle resize-handle-bottom"
          pointerEvents="none"
        />
        <rect
          data-testid={`resize-handle-${room.id}-bottom`}
          x={mm(room.x + room.width / 2) - HANDLE_HITBOX_SIZE / 2}
          y={mm(room.y + room.depth) - HANDLE_HITBOX_SIZE / 2}
          width={HANDLE_HITBOX_SIZE}
          height={HANDLE_HITBOX_SIZE}
          fill="transparent"
          cursor="ns-resize"
          className="resize-handle-hitbox"
          onMouseDown={e => {
            e.stopPropagation();
            onResizeStart?.(room.id, 'bottom');
          }}
          onDoubleClick={e => {
            e.stopPropagation();
            onResizeNumeric?.(room.id, 'bottom', room.depth);
          }}
        />
      </g>
    </g>
  );
}

export type { ResizeEdge };
