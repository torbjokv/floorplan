import { useState, useRef, useEffect, useMemo } from 'react';
import type { ResolvedRoom, Anchor } from '../../types';
import { calculateCompositeRoomOutline, polygonToSvgPath, type Rectangle } from '../../geometry';

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

interface EditableRoomLabelProps {
  room: ResolvedRoom;
  x: number;
  y: number;
  onNameUpdate?: (roomId: string, newName: string) => void;
}

interface EditableRoomDimensionsProps {
  room: ResolvedRoom;
  x: number;
  y: number;
  onDimensionsUpdate?: (roomId: string, width: number, depth: number) => void;
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
          onChange={e => setEditValue(e.target.value)}
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
            boxSizing: 'border-box',
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

function EditableRoomDimensions({ room, x, y, onDimensionsUpdate }: EditableRoomDimensionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [widthValue, setWidthValue] = useState(room.width.toString());
  const [depthValue, setDepthValue] = useState(room.depth.toString());
  const widthInputRef = useRef<HTMLInputElement>(null);
  const depthInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && widthInputRef.current) {
      widthInputRef.current.focus();
      widthInputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setWidthValue(room.width.toString());
    setDepthValue(room.depth.toString());
  };

  const handleBlur = () => {
    setIsEditing(false);
    const newWidth = parseInt(widthValue, 10);
    const newDepth = parseInt(depthValue, 10);

    if (!isNaN(newWidth) && !isNaN(newDepth) && newWidth >= 500 && newDepth >= 500) {
      if (newWidth !== room.width || newDepth !== room.depth) {
        onDimensionsUpdate?.(room.id, newWidth, newDepth);
      }
    }
  };

  const handleWidthKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setWidthValue(room.width.toString());
      setDepthValue(room.depth.toString());
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      depthInputRef.current?.focus();
      depthInputRef.current?.select();
    }
  };

  const handleDepthKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setWidthValue(room.width.toString());
      setDepthValue(room.depth.toString());
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      widthInputRef.current?.focus();
      widthInputRef.current?.select();
    }
  };

  if (isEditing) {
    return (
      <foreignObject x={x - 150} y={y - 20} width={300} height={40}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <input
            ref={widthInputRef}
            type="number"
            value={widthValue}
            onChange={e => setWidthValue(e.target.value)}
            onKeyDown={handleWidthKeyDown}
            placeholder="Width"
            style={{
              width: '80px',
              height: '100%',
              textAlign: 'center',
              fontSize: '14px',
              border: '2px solid #646cff',
              borderRadius: '4px',
              padding: '4px',
              background: 'white',
              color: 'black',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ color: 'black', fontSize: '16px', fontWeight: 'bold' }}>×</span>
          <input
            ref={depthInputRef}
            type="number"
            value={depthValue}
            onChange={e => setDepthValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleDepthKeyDown}
            placeholder="Depth"
            style={{
              width: '80px',
              height: '100%',
              textAlign: 'center',
              fontSize: '14px',
              border: '2px solid #646cff',
              borderRadius: '4px',
              padding: '4px',
              background: 'white',
              color: 'black',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </foreignObject>
    );
  }

  return (
    <text
      x={x}
      y={y}
      fontSize="12"
      textAnchor="middle"
      dominantBaseline="middle"
      onDoubleClick={handleDoubleClick}
      style={{ cursor: 'text', userSelect: 'none', fill: '#888' }}
      data-testid={`room-dimensions-${room.id}`}
    >
      {room.width}×{room.depth}mm
    </text>
  );
}

export interface ResolvedPart {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
}

interface RoomRendererProps {
  room: ResolvedRoom;
  dragState: DragState | null;
  dragOffset: { x: number; y: number } | null;
  hoveredCorner: { roomId: string; corner: Anchor; partId?: string } | null;
  isConnected: boolean;
  selectedPartId?: string | null;
  mm: (val: number) => number;
  resolveCompositeRoom: (room: ResolvedRoom) => Array<ResolvedPart>;
  getCorner: (room: ResolvedRoom, corner: Anchor) => { x: number; y: number };
  onMouseDown: (e: React.MouseEvent<SVGElement>, roomId: string) => void;
  onPartMouseDown?: (e: React.MouseEvent<SVGElement>, roomId: string, partId: string) => void;
  onClick?: (roomId: string) => void;
  onPartClick?: (roomId: string, partId: string) => void;
  onNameUpdate?: (roomId: string, newName: string) => void;
  onDimensionsUpdate?: (roomId: string, width: number, depth: number) => void;
  onMouseEnter?: (roomId: string) => void;
  onMouseLeave?: () => void;
  onFocus?: (roomId: string) => void;
}

/**
 * RoomRenderer uses a unified path-based approach for both simple rooms and composite rooms.
 *
 * Architecture:
 * 1. Every room is treated the same - a collection of rectangles (1 for simple, N for composite)
 * 2. The outer boundary is calculated using polygon union algorithm
 * 3. A single SVG path is drawn for the outline (no line hack needed)
 * 4. Invisible rectangles provide click targets for individual parts
 *
 * This eliminates the previous approach of drawing rectangles with borders
 * and then covering internal edges with colored lines.
 */
export function RoomRenderer({
  room,
  dragState,
  dragOffset,
  isConnected,
  selectedPartId,
  mm,
  resolveCompositeRoom,
  onMouseDown,
  onPartMouseDown,
  onClick,
  onPartClick,
  onNameUpdate,
  onDimensionsUpdate,
  onMouseEnter,
  onMouseLeave,
  onFocus,
}: RoomRendererProps) {
  const parts = resolveCompositeRoom(room);

  // Build array of all rectangles (main room + parts)
  // A simple room has 0 parts, so this array has 1 element
  // A composite room has N parts, so this array has N+1 elements
  const allRectangles: Rectangle[] = useMemo(() => {
    const mainRect: Rectangle = {
      x: room.x,
      y: room.y,
      width: room.width,
      depth: room.depth,
    };
    const partRects: Rectangle[] = parts.map(p => ({
      x: p.x,
      y: p.y,
      width: p.width,
      depth: p.depth,
    }));
    return [mainRect, ...partRects];
  }, [room.x, room.y, room.width, room.depth, parts]);

  // Calculate the outer boundary polygon
  const outlinePath = useMemo(() => {
    const outline = calculateCompositeRoomOutline(allRectangles);
    return polygonToSvgPath(outline, mm);
  }, [allRectangles, mm]);

  // Apply drag offset if this room or any of its parts is being dragged
  const isRoomDragging = dragState?.roomId === room.id && !dragState?.partId;
  const isAnyPartDragging = dragState?.parentRoomId === room.id && dragState?.partId;
  // Room moves with offset only when room is dragged (not when part is dragged)
  const transform =
    isRoomDragging && dragOffset ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})` : undefined;

  // Label position: center of main room only (not across all parts)
  const labelX = mm(room.x + room.width / 2);
  const labelY = mm(room.y + room.depth / 2);

  const hasMultipleParts = parts.length > 0;

  return (
    <g
      key={room.id}
      className={hasMultipleParts ? 'composite-room' : undefined}
      data-room-id={room.id}
      transform={transform}
      onMouseEnter={() => onMouseEnter?.(room.id)}
      onMouseLeave={() => onMouseLeave?.()}
    >
      {/* Layer 1: Unified fill using path - covers the entire shape without internal borders */}
      <path
        className="room-fill"
        d={outlinePath}
        fill="#e0ebe8"
        stroke="none"
        onClick={() => {
          onClick?.(room.id);
          onFocus?.(room.id);
        }}
        onMouseDown={e => onMouseDown(e, room.id)}
        style={{ cursor: isRoomDragging || isAnyPartDragging ? 'grabbing' : 'grab' }}
      />

      {/* Layer 2: Unified outline using path - only external borders visible */}
      <path
        className="room-outline"
        d={outlinePath}
        fill="none"
        stroke={isConnected ? '#646cff' : 'black'}
        strokeWidth={isConnected ? '3' : '2'}
        opacity={isConnected ? 0.7 : 1}
        pointerEvents="none"
      />

      {/* Layer 3: Main room rect for hover effects and resize handle detection */}
      <rect
        className={hasMultipleParts ? 'room-rect composite-part' : 'room-rect'}
        x={mm(room.x)}
        y={mm(room.y)}
        width={mm(room.width)}
        height={mm(room.depth)}
        fill="transparent"
        stroke="none"
        onClick={() => {
          onClick?.(room.id);
          onFocus?.(room.id);
        }}
        onMouseDown={e => onMouseDown(e, room.id)}
        style={{ cursor: isRoomDragging ? 'grabbing' : 'grab' }}
      />

      {/* Layer 4: Part click regions with selection highlight (only for composite rooms) */}
      {hasMultipleParts &&
        parts.map((part, idx) => {
          const isPartSelected = selectedPartId === part.id;
          const isThisPartDragging = dragState?.partId === part.id;
          // Calculate transform for this specific part when it's being dragged
          const partTransform =
            isThisPartDragging && dragOffset
              ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
              : undefined;
          return (
            <rect
              className="room-rect composite-part"
              key={`part-${idx}`}
              data-part-id={part.id}
              data-testid={`part-${part.id}`}
              x={mm(part.x)}
              y={mm(part.y)}
              width={mm(part.width)}
              height={mm(part.depth)}
              fill="transparent"
              stroke={isPartSelected ? '#646cff' : 'none'}
              strokeWidth={isPartSelected ? '4' : '0'}
              transform={partTransform}
              onClick={e => {
                e.stopPropagation();
                onPartClick?.(room.id, part.id);
              }}
              onMouseDown={e => {
                e.stopPropagation();
                onPartMouseDown?.(e, room.id, part.id);
              }}
              style={{ cursor: isThisPartDragging ? 'grabbing' : 'grab' }}
            />
          );
        })}

      {/* Room label */}
      <EditableRoomLabel room={room} x={labelX} y={labelY - 10} onNameUpdate={onNameUpdate} />

      {/* Room dimensions */}
      <EditableRoomDimensions
        room={room}
        x={labelX}
        y={labelY + 20}
        onDimensionsUpdate={onDimensionsUpdate}
      />
    </g>
  );
}
