import type { ResolvedRoom, Room } from '../../types';

type OffsetDirection = 'left' | 'right' | 'top' | 'bottom';

interface OffsetArrowsProps {
  room: ResolvedRoom;
  originalRoom: Room;
  mm: (val: number) => number;
  onOffsetDragStart?: (roomId: string, direction: OffsetDirection) => void;
  onMouseEnter?: () => void;
  visible?: boolean;
  showDirections?: OffsetDirection[]; // If provided, only show these directions
}

const ARROW_SIZE = 24; // pixels - visual size
const ARROW_HITBOX_SIZE = 40; // pixels - larger clickable area
const ARROW_COLOR = '#e67e22'; // Orange to distinguish from resize handles
const ARROW_OFFSET = 30; // pixels - offset from room edge

// Helper to create double-headed arrow path
function createArrowPath(
  centerX: number,
  centerY: number,
  isHorizontal: boolean,
  size: number
): string {
  const halfSize = size / 2;
  const arrowHeadSize = size / 3;

  if (isHorizontal) {
    // Horizontal double-headed arrow <-->
    return `
      M ${centerX - halfSize} ${centerY}
      L ${centerX - halfSize + arrowHeadSize} ${centerY - arrowHeadSize / 1.5}
      L ${centerX - halfSize + arrowHeadSize} ${centerY - arrowHeadSize / 3}
      L ${centerX + halfSize - arrowHeadSize} ${centerY - arrowHeadSize / 3}
      L ${centerX + halfSize - arrowHeadSize} ${centerY - arrowHeadSize / 1.5}
      L ${centerX + halfSize} ${centerY}
      L ${centerX + halfSize - arrowHeadSize} ${centerY + arrowHeadSize / 1.5}
      L ${centerX + halfSize - arrowHeadSize} ${centerY + arrowHeadSize / 3}
      L ${centerX - halfSize + arrowHeadSize} ${centerY + arrowHeadSize / 3}
      L ${centerX - halfSize + arrowHeadSize} ${centerY + arrowHeadSize / 1.5}
      Z
    `;
  } else {
    // Vertical double-headed arrow
    return `
      M ${centerX} ${centerY - halfSize}
      L ${centerX - arrowHeadSize / 1.5} ${centerY - halfSize + arrowHeadSize}
      L ${centerX - arrowHeadSize / 3} ${centerY - halfSize + arrowHeadSize}
      L ${centerX - arrowHeadSize / 3} ${centerY + halfSize - arrowHeadSize}
      L ${centerX - arrowHeadSize / 1.5} ${centerY + halfSize - arrowHeadSize}
      L ${centerX} ${centerY + halfSize}
      L ${centerX + arrowHeadSize / 1.5} ${centerY + halfSize - arrowHeadSize}
      L ${centerX + arrowHeadSize / 3} ${centerY + halfSize - arrowHeadSize}
      L ${centerX + arrowHeadSize / 3} ${centerY - halfSize + arrowHeadSize}
      L ${centerX + arrowHeadSize / 1.5} ${centerY - halfSize + arrowHeadSize}
      Z
    `;
  }
}

export function OffsetArrows({
  room,
  originalRoom,
  mm,
  onOffsetDragStart,
  onMouseEnter,
  visible = true,
  showDirections,
}: OffsetArrowsProps) {
  if (!visible) return null;

  // Only show offset arrows for rooms that have an attachTo reference
  // (not the first room at origin which doesn't have meaningful offset adjustment)
  const hasAttachTo = originalRoom.attachTo && !originalRoom.attachTo.startsWith('zeropoint:');
  if (!hasAttachTo) return null;

  // Determine which directions to show
  const showLeft = !showDirections || showDirections.includes('left');
  const showRight = !showDirections || showDirections.includes('right');
  const showTop = !showDirections || showDirections.includes('top');
  const showBottom = !showDirections || showDirections.includes('bottom');

  // Calculate arrow positions at the middle of each edge, offset outward
  const leftArrowX = mm(room.x) - ARROW_OFFSET;
  const leftArrowY = mm(room.y + room.depth / 2);

  const rightArrowX = mm(room.x + room.width) + ARROW_OFFSET;
  const rightArrowY = mm(room.y + room.depth / 2);

  const topArrowX = mm(room.x + room.width / 2);
  const topArrowY = mm(room.y) - ARROW_OFFSET;

  const bottomArrowX = mm(room.x + room.width / 2);
  const bottomArrowY = mm(room.y + room.depth) + ARROW_OFFSET;

  return (
    <g
      className="offset-arrows"
      data-room-id={`${room.id}-offset-arrows`}
      onMouseEnter={onMouseEnter}
    >
      {/* Left arrow - horizontal */}
      {showLeft && (
        <g>
          <path
            d={createArrowPath(leftArrowX, leftArrowY, true, ARROW_SIZE)}
            fill={ARROW_COLOR}
            stroke="#fff"
            strokeWidth="1"
            className="offset-arrow offset-arrow-left"
            pointerEvents="none"
          />
          <rect
            data-testid={`offset-arrow-${room.id}-left`}
            x={leftArrowX - ARROW_HITBOX_SIZE / 2}
            y={leftArrowY - ARROW_HITBOX_SIZE / 2}
            width={ARROW_HITBOX_SIZE}
            height={ARROW_HITBOX_SIZE}
            fill="transparent"
            cursor="move"
            className="offset-arrow-hitbox"
            onMouseDown={e => {
              e.stopPropagation();
              onOffsetDragStart?.(room.id, 'left');
            }}
          />
        </g>
      )}

      {/* Right arrow - horizontal */}
      {showRight && (
        <g>
          <path
            d={createArrowPath(rightArrowX, rightArrowY, true, ARROW_SIZE)}
            fill={ARROW_COLOR}
            stroke="#fff"
            strokeWidth="1"
            className="offset-arrow offset-arrow-right"
            pointerEvents="none"
          />
          <rect
            data-testid={`offset-arrow-${room.id}-right`}
            x={rightArrowX - ARROW_HITBOX_SIZE / 2}
            y={rightArrowY - ARROW_HITBOX_SIZE / 2}
            width={ARROW_HITBOX_SIZE}
            height={ARROW_HITBOX_SIZE}
            fill="transparent"
            cursor="move"
            className="offset-arrow-hitbox"
            onMouseDown={e => {
              e.stopPropagation();
              onOffsetDragStart?.(room.id, 'right');
            }}
          />
        </g>
      )}

      {/* Top arrow - vertical */}
      {showTop && (
        <g>
          <path
            d={createArrowPath(topArrowX, topArrowY, false, ARROW_SIZE)}
            fill={ARROW_COLOR}
            stroke="#fff"
            strokeWidth="1"
            className="offset-arrow offset-arrow-top"
            pointerEvents="none"
          />
          <rect
            data-testid={`offset-arrow-${room.id}-top`}
            x={topArrowX - ARROW_HITBOX_SIZE / 2}
            y={topArrowY - ARROW_HITBOX_SIZE / 2}
            width={ARROW_HITBOX_SIZE}
            height={ARROW_HITBOX_SIZE}
            fill="transparent"
            cursor="move"
            className="offset-arrow-hitbox"
            onMouseDown={e => {
              e.stopPropagation();
              onOffsetDragStart?.(room.id, 'top');
            }}
          />
        </g>
      )}

      {/* Bottom arrow - vertical */}
      {showBottom && (
        <g>
          <path
            d={createArrowPath(bottomArrowX, bottomArrowY, false, ARROW_SIZE)}
            fill={ARROW_COLOR}
            stroke="#fff"
            strokeWidth="1"
            className="offset-arrow offset-arrow-bottom"
            pointerEvents="none"
          />
          <rect
            data-testid={`offset-arrow-${room.id}-bottom`}
            x={bottomArrowX - ARROW_HITBOX_SIZE / 2}
            y={bottomArrowY - ARROW_HITBOX_SIZE / 2}
            width={ARROW_HITBOX_SIZE}
            height={ARROW_HITBOX_SIZE}
            fill="transparent"
            cursor="move"
            className="offset-arrow-hitbox"
            onMouseDown={e => {
              e.stopPropagation();
              onOffsetDragStart?.(room.id, 'bottom');
            }}
          />
        </g>
      )}
    </g>
  );
}

export type { OffsetDirection };
