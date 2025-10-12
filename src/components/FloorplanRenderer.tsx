import { useEffect, useMemo } from 'react';
import type { FloorplanData, ResolvedRoom, Door, Window, WallPosition } from '../types';
import { mm, resolveRoomPositions, resolveCompositeRoom } from '../utils';

interface FloorplanRendererProps {
  data: FloorplanData;
  onPositioningErrors?: (errors: string[]) => void;
}

export function FloorplanRenderer({ data, onPositioningErrors }: FloorplanRendererProps) {
  const gridStep = data.grid_step || 1000;

  // Memoize room resolution to avoid recalculating on every render
  const { roomMap, errors } = useMemo(() => resolveRoomPositions(data.rooms), [data.rooms]);

  // Notify parent component of positioning errors
  useEffect(() => {
    if (onPositioningErrors) {
      onPositioningErrors(errors);
    }
  }, [errors, onPositioningErrors]);

  // Calculate bounding box for all rooms and their parts
  const calculateBounds = () => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    Object.values(roomMap).forEach(room => {
      const parts = resolveCompositeRoom(room);

      // Check main room bounds
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.depth);

      // Check parts bounds
      parts.forEach(part => {
        minX = Math.min(minX, part.x);
        minY = Math.min(minY, part.y);
        maxX = Math.max(maxX, part.x + part.width);
        maxY = Math.max(maxY, part.y + part.depth);
      });
    });

    // Add padding (10% on each side)
    const width = maxX - minX;
    const depth = maxY - minY;
    const padding = Math.max(width, depth) * 0.1;

    return {
      x: minX - padding,
      y: minY - padding,
      width: width + padding * 2,
      depth: depth + padding * 2
    };
  };

  // Memoize bounds calculation to avoid recalculating on every render
  const bounds = useMemo(() => {
    return Object.keys(roomMap).length > 0
      ? calculateBounds()
      : { x: 0, y: 0, width: 10000, depth: 10000 };
  }, [roomMap]);

  // Calculate grid bounds based on actual content
  const gridMinX = Math.floor(bounds.x / gridStep) * gridStep;
  const gridMinY = Math.floor(bounds.y / gridStep) * gridStep;
  const gridMaxX = Math.ceil((bounds.x + bounds.width) / gridStep) * gridStep;
  const gridMaxY = Math.ceil((bounds.y + bounds.depth) / gridStep) * gridStep;

  const renderGrid = () => {
    const lines = [];

    // Vertical lines
    for (let i = gridMinX; i <= gridMaxX; i += gridStep) {
      lines.push(
        <line
          key={`v-${i}`}
          x1={mm(i)}
          y1={mm(gridMinY)}
          x2={mm(i)}
          y2={mm(gridMaxY)}
          stroke="#eee"
        />
      );
    }

    // Horizontal lines
    for (let i = gridMinY; i <= gridMaxY; i += gridStep) {
      lines.push(
        <line
          key={`h-${i}`}
          x1={mm(gridMinX)}
          y1={mm(i)}
          x2={mm(gridMaxX)}
          y2={mm(i)}
          stroke="#eee"
        />
      );
    }

    return lines;
  };

  const renderRoom = (room: ResolvedRoom) => {
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

      return (
        <g key={room.name}>
          {/* Layer 1: All rectangles WITH borders */}
          <rect
            x={mm(room.x)}
            y={mm(room.y)}
            width={mm(room.width)}
            height={mm(room.depth)}
            fill="#e0ebe8"
            stroke="black"
            strokeWidth="2"
          />
          {parts.map((part, idx) => (
            <rect
              key={`border-${idx}`}
              x={mm(part.x)}
              y={mm(part.y)}
              width={mm(part.width)}
              height={mm(part.depth)}
              fill="#e0ebe8"
              stroke="black"
              strokeWidth="2"
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
          <text
            x={mm(room.x + room.width / 2)}
            y={mm(room.y + room.depth / 2)}
            fontSize="14"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {room.name}
          </text>

          {/* Room objects */}
          {room.objects?.map((obj, idx) => {
            const absX = room.x + obj.x;
            const absY = room.y + obj.y;
            const color = obj.color || '#888';

            if (obj.type === 'circle') {
              const radius = mm(obj.radius || 500);
              return (
                <circle
                  key={`obj-${idx}`}
                  cx={mm(absX)}
                  cy={mm(absY)}
                  r={radius}
                  fill={color}
                  stroke="#333"
                  strokeWidth="1"
                />
              );
            } else {
              // Square
              const w = mm(obj.width || 1000);
              const h = mm(obj.height || 1000);
              return (
                <rect
                  key={`obj-${idx}`}
                  x={mm(absX) - w / 2}
                  y={mm(absY) - h / 2}
                  width={w}
                  height={h}
                  fill={color}
                  stroke="#333"
                  strokeWidth="1"
                />
              );
            }
          })}
        </g>
      );
    }

    // Simple room without parts
    return (
      <g key={room.name}>
        <rect
          x={mm(room.x)}
          y={mm(room.y)}
          width={mm(room.width)}
          height={mm(room.depth)}
          fill="#e0ebe8"
          stroke="black"
          strokeWidth="2"
        />

        {/* Room label */}
        <text
          x={mm(room.x + room.width / 2)}
          y={mm(room.y + room.depth / 2)}
          fontSize="14"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {room.name}
        </text>

        {/* Room objects */}
        {room.objects?.map((obj, idx) => {
          const absX = room.x + obj.x;
          const absY = room.y + obj.y;
          const color = obj.color || '#888';

          if (obj.type === 'circle') {
            const radius = mm(obj.radius || 500);
            return (
              <g key={`obj-${idx}`}>
                <circle
                  cx={mm(absX)}
                  cy={mm(absY)}
                  r={radius}
                  fill={color}
                  stroke="#333"
                  strokeWidth="1"
                />
                {obj.text && (
                  <text
                    x={mm(absX)}
                    y={mm(absY)}
                    fontSize="12"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    stroke="#000"
                    strokeWidth="0.5"
                    paintOrder="stroke"
                  >
                    {obj.text}
                  </text>
                )}
              </g>
            );
          } else {
            // Square - apply anchor adjustment
            const w = mm(obj.width || 1000);
            const h = mm(obj.height || 1000);
            const anchor = obj.anchor || 'top-left';

            // Calculate position based on anchor
            let rectX = mm(absX);
            let rectY = mm(absY);
            let centerX = mm(absX);
            let centerY = mm(absY);

            switch (anchor) {
              case 'top-left':
                centerX = rectX + w / 2;
                centerY = rectY + h / 2;
                break;
              case 'top-right':
                rectX = rectX - w;
                centerX = rectX + w / 2;
                centerY = rectY + h / 2;
                break;
              case 'bottom-left':
                rectY = rectY - h;
                centerX = rectX + w / 2;
                centerY = rectY + h / 2;
                break;
              case 'bottom-right':
                rectX = rectX - w;
                rectY = rectY - h;
                centerX = rectX + w / 2;
                centerY = rectY + h / 2;
                break;
            }

            return (
              <g key={`obj-${idx}`}>
                <rect
                  x={rectX}
                  y={rectY}
                  width={w}
                  height={h}
                  fill={color}
                  stroke="#333"
                  strokeWidth="1"
                />
                {obj.text && (
                  <text
                    x={centerX}
                    y={centerY}
                    fontSize="12"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    stroke="#000"
                    strokeWidth="0.5"
                    paintOrder="stroke"
                  >
                    {obj.text}
                  </text>
                )}
              </g>
            );
          }
        })}
      </g>
    );
  };

  const renderDoor = (door: Door, index: number) => {
    const [roomName, wallStr = 'left'] = door.room.split(':') as [string, WallPosition];
    const room = roomMap[roomName];
    if (!room) return null;

    const wall = wallStr as WallPosition;
    const offset = mm(door.offset ?? 0);
    const swing = door.swing || 'inwards-right';
    const w = mm(door.width);
    const d = mm(100); // Fixed door thickness: 100mm

    // Determine if door swings inwards or outwards, and left or right
    const isInwards = swing.startsWith('inwards');
    const isRight = swing.endsWith('right');

    // Calculate position based on wall and offset
    let x: number, y: number;
    let doorRect: { x: number; y: number; width: number; height: number };
    let arcPath: string;

    switch (wall) {
      case 'bottom':
        // Bottom wall - door opens into room (upward)
        x = mm(room.x) + offset;
        y = mm(room.y + room.depth);

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
        x = mm(room.x) + offset;
        y = mm(room.y);

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
        x = mm(room.x);
        y = mm(room.y) + offset;

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
        x = mm(room.x + room.width);
        y = mm(room.y) + offset;

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

    return (
      <g key={`door-${index}`}>
        {/* Door rectangle */}
        <rect
          x={x + doorRect.x}
          y={y + doorRect.y}
          width={doorRect.width}
          height={doorRect.height}
          fill="saddlebrown"
          stroke="#333"
          strokeWidth="1"
        />
        {/* Door swing arc */}
        <path
          d={arcPath}
          transform={`translate(${x},${y})`}
          fill="none"
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="4,2"
        />
      </g>
    );
  };

  const renderWindow = (win: Window, index: number) => {
    const [roomName, wallStr = 'top'] = win.room.split(':') as [string, WallPosition];
    const room = roomMap[roomName];
    if (!room) return null;

    const wall = wallStr as WallPosition;
    const offset = win.offset ?? 0;
    const w = mm(win.width);
    const d = mm(100); // Fixed window thickness: 100mm

    // Calculate position and rotation based on wall
    let posX: number, posY: number, rotation: number;
    let rectX = 0, rectY = 0;

    switch (wall) {
      case 'left':
        posX = room.x;
        posY = room.y + offset;
        rotation = 90;
        rectX = 0;  // Window thickness extends into room (rightward)
        rectY = -d; // Shift up by window thickness (which is rotated)
        break;

      case 'right':
        posX = room.x + room.width;
        posY = room.y + offset;
        rotation = 90;
        rectX = -d; // Window extends into room
        rectY = 0;
        break;

      case 'top':
        posX = room.x + offset;
        posY = room.y;
        rotation = 0;
        rectX = 0;
        rectY = 0;  // Window extends into room (downward)
        break;

      case 'bottom':
        posX = room.x + offset;
        posY = room.y + room.depth;
        rotation = 0;
        rectX = 0;
        rectY = -d; // Window extends into room (upward)
        break;

      default:
        return null;
    }

    const x = mm(posX);
    const y = mm(posY);

    return (
      <g key={`window-${index}`} transform={`translate(${x},${y}) rotate(${rotation})`}>
        <rect
          x={rectX}
          y={rectY}
          width={w}
          height={d}
          fill="lightblue"
          stroke="#444"
          strokeWidth="2"
        />
      </g>
    );
  };

  // Convert bounds to screen coordinates
  const viewBox = `${mm(bounds.x)} ${mm(bounds.y)} ${mm(bounds.width)} ${mm(bounds.depth)}`;

  return (
    <div className="preview-container">
      <h2>🏠 SVG Preview</h2>
      <svg
        className="floorplan-svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid */}
        {renderGrid()}

        {/* Rooms */}
        {Object.values(roomMap).map(renderRoom)}

        {/* Doors */}
        {data.doors?.map(renderDoor)}

        {/* Windows */}
        {data.windows?.map(renderWindow)}
      </svg>
    </div>
  );
}
