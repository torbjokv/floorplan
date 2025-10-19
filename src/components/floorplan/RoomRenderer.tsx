import { useState, useRef, useEffect } from 'react';
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

interface EditableRoomLabelProps {
  room: ResolvedRoom;
  x: number;
  y: number;
  onNameUpdate?: (roomId: string, newName: string) => void;
}

function EditableRoomLabel({ room, x, y, onNameUpdate }: EditableRoomLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(room.name || room.id);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(room.name || room.id);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== (room.name || room.id)) {
      onNameUpdate?.(room.id, editValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(room.name || room.id);
    }
  };

  if (isEditing) {
    return (
      <foreignObject x={x - 150} y={y - 20} width={300} height={40}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            textAlign: 'center',
            fontSize: '16px',
            border: '2px solid #646cff',
            borderRadius: '4px',
            padding: '4px 8px',
            background: 'white',
            color: 'black',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </foreignObject>
    );
  }

  return (
    <text
      x={x}
      y={y}
      fontSize="14"
      textAnchor="middle"
      dominantBaseline="middle"
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'text', userSelect: 'none' }}
    >
      {room.name || room.id}
    </text>
  );
}

interface RoomRendererProps {
  room: ResolvedRoom;
  dragState: DragState | null;
  dragOffset: { x: number; y: number } | null;
  hoveredCorner: { roomId: string; corner: Anchor } | null;
  isConnected: boolean;
  mm: (val: number) => number;
  resolveCompositeRoom: (room: ResolvedRoom) => Array<{ x: number; y: number; width: number; depth: number }>;
  getCorner: (room: ResolvedRoom, corner: Anchor) => { x: number; y: number };
  onMouseDown: (e: React.MouseEvent<SVGElement>, roomId: string) => void;
  onClick?: (roomId: string) => void;
  onNameUpdate?: (roomId: string, newName: string) => void;
}

export function RoomRenderer({
  room,
  dragState,
  dragOffset,
  isConnected,
  mm,
  resolveCompositeRoom,
  onMouseDown,
  onClick,
  onNameUpdate
}: RoomRendererProps) {
  const parts = resolveCompositeRoom(room);

  // For composite rooms, draw all rectangles WITH borders, then cover internal borders
  if (parts.length > 0) {
    const allParts = [
      { x: room.x, y: room.y, width: room.width, depth: room.depth },
      ...parts
    ];

    // Find shared edges between rectangles
    interface Edge {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isVertical: boolean;
    }

    const sharedEdges: Edge[] = [];

    // Check each pair of rectangles for shared edges
    for (let i = 0; i < allParts.length; i++) {
      for (let j = i + 1; j < allParts.length; j++) {
        const a = allParts[i];
        const b = allParts[j];

        // Check if they share a vertical edge (left/right sides touching)
        if (a.x + a.width === b.x && !(a.y + a.depth <= b.y || b.y + b.depth <= a.y)) {
          // A's right edge touches B's left edge
          const overlapTop = Math.max(a.y, b.y);
          const overlapBottom = Math.min(a.y + a.depth, b.y + b.depth);
          sharedEdges.push({
            x1: a.x + a.width,
            y1: overlapTop,
            x2: a.x + a.width,
            y2: overlapBottom,
            isVertical: true
          });
        } else if (b.x + b.width === a.x && !(a.y + a.depth <= b.y || b.y + b.depth <= a.y)) {
          // B's right edge touches A's left edge
          const overlapTop = Math.max(a.y, b.y);
          const overlapBottom = Math.min(a.y + a.depth, b.y + b.depth);
          sharedEdges.push({
            x1: b.x + b.width,
            y1: overlapTop,
            x2: b.x + b.width,
            y2: overlapBottom,
            isVertical: true
          });
        }

        // Check if they share a horizontal edge (top/bottom sides touching)
        if (a.y + a.depth === b.y && !(a.x + a.width <= b.x || b.x + b.width <= a.x)) {
          // A's bottom edge touches B's top edge
          const overlapLeft = Math.max(a.x, b.x);
          const overlapRight = Math.min(a.x + a.width, b.x + b.width);
          sharedEdges.push({
            x1: overlapLeft,
            y1: a.y + a.depth,
            x2: overlapRight,
            y2: a.y + a.depth,
            isVertical: false
          });
        } else if (b.y + b.depth === a.y && !(a.x + a.width <= b.x || b.x + b.width <= a.x)) {
          // B's bottom edge touches A's top edge
          const overlapLeft = Math.max(a.x, b.x);
          const overlapRight = Math.min(a.x + a.width, b.x + b.width);
          sharedEdges.push({
            x1: overlapLeft,
            y1: b.y + b.depth,
            x2: overlapRight,
            y2: b.y + b.depth,
            isVertical: false
          });
        }
      }
    }

    // Apply drag offset if this room is being dragged
    const isDragging = dragState?.roomId === room.id;
    const transform = isDragging && dragOffset
      ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
      : undefined;

    return (
      <g
        key={room.id}
        className="composite-room"
        data-room-id={room.id}
        transform={transform}
      >
        {/* Layer 1: All rectangles WITH borders */}
        <rect
          className="room-rect composite-part"
          x={mm(room.x)}
          y={mm(room.y)}
          width={mm(room.width)}
          height={mm(room.depth)}
          fill="#e0ebe8"
          stroke={isConnected ? '#646cff' : 'black'}
          strokeWidth={isConnected ? '3' : '2'}
          opacity={isConnected ? 0.7 : 1}
          onClick={() => onClick?.(room.id)}
          onMouseDown={(e) => onMouseDown(e, room.id)}
          style={{ cursor: dragState?.roomId === room.id ? 'grabbing' : 'grab' }}
        />
        {parts.map((part, idx) => (
          <rect
            className="room-rect composite-part"
            key={`border-${idx}`}
            x={mm(part.x)}
            y={mm(part.y)}
            width={mm(part.width)}
            height={mm(part.depth)}
            fill="#e0ebe8"
            stroke={isConnected ? '#646cff' : 'black'}
            strokeWidth={isConnected ? '3' : '2'}
            opacity={isConnected ? 0.7 : 1}
            onClick={() => onClick?.(room.id)}
          />
        ))}

        {/* Layer 2: Cover only the shared edges */}
        {sharedEdges.map((edge, idx) => (
          <line
            key={`cover-${idx}`}
            x1={mm(edge.x1)}
            y1={mm(edge.y1)}
            x2={mm(edge.x2)}
            y2={mm(edge.y2)}
            stroke="#e0ebe8"
            strokeWidth="3"
          />
        ))}

        {/* Room label */}
        <EditableRoomLabel
          room={room}
          x={mm(room.x + room.width / 2)}
          y={mm(room.y + room.depth / 2)}
          onNameUpdate={onNameUpdate}
        />
      </g>
    );
  }

  // Simple room without parts
  // Apply drag offset if this room is being dragged
  const isDragging = dragState?.roomId === room.id;
  const transform = isDragging && dragOffset
    ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
    : undefined;

  return (
    <g key={room.id} transform={transform}>
      <rect
        className="room-rect"
        x={mm(room.x)}
        y={mm(room.y)}
        width={mm(room.width)}
        height={mm(room.depth)}
        fill="#e0ebe8"
        stroke={isConnected ? '#646cff' : 'black'}
        strokeWidth={isConnected ? '3' : '2'}
        opacity={isConnected ? 0.7 : 1}
        onClick={() => onClick?.(room.id)}
        onMouseDown={(e) => onMouseDown(e, room.id)}
        style={{ cursor: dragState?.roomId === room.id ? 'grabbing' : 'grab' }}
      />

      {/* Room label */}
      <EditableRoomLabel
        room={room}
        x={mm(room.x + room.width / 2)}
        y={mm(room.y + room.depth / 2)}
        onNameUpdate={onNameUpdate}
      />
    </g>
  );
}
