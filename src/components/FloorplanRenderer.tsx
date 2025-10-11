import type { FloorplanData, ResolvedRoom, Anchor, Door, Window } from '../types';
import { mm, resolveRoomPositions, getCorner, resolveCompositeRoom } from '../utils';

interface FloorplanRendererProps {
  data: FloorplanData;
}

export function FloorplanRenderer({ data }: FloorplanRendererProps) {
  const scale = data.scale || 1;
  const gridStep = data.grid_step || 1000;
  const roomMap = resolveRoomPositions(data.rooms);

  // Calculate bounding box for all rooms and their additions
  const calculateBounds = () => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    Object.values(roomMap).forEach(room => {
      const additions = resolveCompositeRoom(room);

      // Check main room bounds
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.height);

      // Check additions bounds
      additions.forEach(addition => {
        minX = Math.min(minX, addition.x);
        minY = Math.min(minY, addition.y);
        maxX = Math.max(maxX, addition.x + addition.width);
        maxY = Math.max(maxY, addition.y + addition.height);
      });
    });

    // Add padding (10% on each side)
    const width = maxX - minX;
    const height = maxY - minY;
    const padding = Math.max(width, height) * 0.1;

    return {
      x: minX - padding,
      y: minY - padding,
      width: width + padding * 2,
      height: height + padding * 2
    };
  };

  const bounds = Object.keys(roomMap).length > 0
    ? calculateBounds()
    : { x: 0, y: 0, width: 10000, height: 10000 };

  // Calculate grid bounds based on actual content
  const gridMinX = Math.floor(bounds.x / gridStep) * gridStep;
  const gridMinY = Math.floor(bounds.y / gridStep) * gridStep;
  const gridMaxX = Math.ceil((bounds.x + bounds.width) / gridStep) * gridStep;
  const gridMaxY = Math.ceil((bounds.y + bounds.height) / gridStep) * gridStep;

  const renderGrid = () => {
    const lines = [];

    // Vertical lines
    for (let i = gridMinX; i <= gridMaxX; i += gridStep) {
      lines.push(
        <line
          key={`v-${i}`}
          x1={mm(i, scale)}
          y1={mm(gridMinY, scale)}
          x2={mm(i, scale)}
          y2={mm(gridMaxY, scale)}
          stroke="#eee"
        />
      );
    }

    // Horizontal lines
    for (let i = gridMinY; i <= gridMaxY; i += gridStep) {
      lines.push(
        <line
          key={`h-${i}`}
          x1={mm(gridMinX, scale)}
          y1={mm(i, scale)}
          x2={mm(gridMaxX, scale)}
          y2={mm(i, scale)}
          stroke="#eee"
        />
      );
    }

    return lines;
  };

  const renderRoom = (room: ResolvedRoom) => {
    const additions = resolveCompositeRoom(room);

    // For composite rooms, draw all rectangles WITH borders, then cover internal borders
    if (additions.length > 0) {
      const allParts = [
        { x: room.x, y: room.y, width: room.width, height: room.height },
        ...additions
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
          if (a.x + a.width === b.x && !(a.y + a.height <= b.y || b.y + b.height <= a.y)) {
            // A's right edge touches B's left edge
            const overlapTop = Math.max(a.y, b.y);
            const overlapBottom = Math.min(a.y + a.height, b.y + b.height);
            sharedEdges.push({
              x1: a.x + a.width,
              y1: overlapTop,
              x2: a.x + a.width,
              y2: overlapBottom,
              isVertical: true
            });
          } else if (b.x + b.width === a.x && !(a.y + a.height <= b.y || b.y + b.height <= a.y)) {
            // B's right edge touches A's left edge
            const overlapTop = Math.max(a.y, b.y);
            const overlapBottom = Math.min(a.y + a.height, b.y + b.height);
            sharedEdges.push({
              x1: b.x + b.width,
              y1: overlapTop,
              x2: b.x + b.width,
              y2: overlapBottom,
              isVertical: true
            });
          }

          // Check if they share a horizontal edge (top/bottom sides touching)
          if (a.y + a.height === b.y && !(a.x + a.width <= b.x || b.x + b.width <= a.x)) {
            // A's bottom edge touches B's top edge
            const overlapLeft = Math.max(a.x, b.x);
            const overlapRight = Math.min(a.x + a.width, b.x + b.width);
            sharedEdges.push({
              x1: overlapLeft,
              y1: a.y + a.height,
              x2: overlapRight,
              y2: a.y + a.height,
              isVertical: false
            });
          } else if (b.y + b.height === a.y && !(a.x + a.width <= b.x || b.x + b.width <= a.x)) {
            // B's bottom edge touches A's top edge
            const overlapLeft = Math.max(a.x, b.x);
            const overlapRight = Math.min(a.x + a.width, b.x + b.width);
            sharedEdges.push({
              x1: overlapLeft,
              y1: b.y + b.height,
              x2: overlapRight,
              y2: b.y + b.height,
              isVertical: false
            });
          }
        }
      }

      return (
        <g key={room.name}>
          {/* Layer 1: All rectangles WITH borders */}
          <rect
            x={mm(room.x, scale)}
            y={mm(room.y, scale)}
            width={mm(room.width, scale)}
            height={mm(room.height, scale)}
            fill="#e0ebe8"
            stroke="black"
            strokeWidth="2"
          />
          {additions.map((addition, idx) => (
            <rect
              key={`border-${idx}`}
              x={mm(addition.x, scale)}
              y={mm(addition.y, scale)}
              width={mm(addition.width, scale)}
              height={mm(addition.height, scale)}
              fill="#e0ebe8"
              stroke="black"
              strokeWidth="2"
            />
          ))}

          {/* Layer 2: Cover only the shared edges */}
          {sharedEdges.map((edge, idx) => (
            <line
              key={`cover-${idx}`}
              x1={mm(edge.x1, scale)}
              y1={mm(edge.y1, scale)}
              x2={mm(edge.x2, scale)}
              y2={mm(edge.y2, scale)}
              stroke="#e0ebe8"
              strokeWidth="3"
            />
          ))}

          {/* Room label */}
          <text
            x={mm(room.x + room.width / 2, scale)}
            y={mm(room.y + room.height / 2, scale)}
            fontSize="14"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {room.name}
          </text>
        </g>
      );
    }

    // Simple room without additions
    return (
      <g key={room.name}>
        <rect
          x={mm(room.x, scale)}
          y={mm(room.y, scale)}
          width={mm(room.width, scale)}
          height={mm(room.height, scale)}
          fill="#e0ebe8"
          stroke="black"
          strokeWidth="2"
        />

        {/* Room label */}
        <text
          x={mm(room.x + room.width / 2, scale)}
          y={mm(room.y + room.height / 2, scale)}
          fontSize="14"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {room.name}
        </text>
      </g>
    );
  };

  const renderDoor = (door: Door, index: number) => {
    const [roomName, anchorStr = 'top-left'] = door.room.split(':') as [string, Anchor];
    const room = roomMap[roomName];
    if (!room) return null;

    const anchor = getCorner(room, anchorStr);
    const offset = door.offset || [0, 0];
    const posX = anchor.x + offset[0];
    const posY = anchor.y + offset[1];
    const x = mm(posX, scale);
    const y = mm(posY, scale);
    const w = mm(door.width, scale);
    const d = mm(door.depth || 100, scale); // Default depth 100mm
    const rot = door.rotation || 0;
    const swing = door.swing || 'right';

    // Door swing arc - the arc shows where the door swings to
    // The hinge is at one end, and the arc shows the swing path
    // Door is positioned inward (negative y direction from the wall)
    // swing 'right': hinge on left (x=0), door swings right
    // swing 'left': hinge on right (x=w), door swings left

    let doorRect, arcPath;

    if (swing === 'right') {
      // Hinge on left side at (0, 0), door swings to the right
      doorRect = { x: 0, y: -d };
      // Arc from hinge (0, 0) to door end position (w, -w)
      arcPath = `M 0 0 A ${w} ${w} 0 0 1 ${w} ${-w}`;
    } else {
      // Hinge on right side at (w, 0), door swings to the left
      doorRect = { x: 0, y: -d };
      // Arc from hinge (w, 0) to door end position (0, -w)
      arcPath = `M ${w} 0 A ${w} ${w} 0 0 0 0 ${-w}`;
    }

    return (
      <g key={`door-${index}`} transform={`translate(${x},${y}) rotate(${rot})`}>
        {/* Door rectangle */}
        <rect
          x={doorRect.x}
          y={doorRect.y}
          width={w}
          height={d}
          fill="saddlebrown"
          stroke="#333"
          strokeWidth="1"
        />
        {/* Door swing arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="4,2"
        />
      </g>
    );
  };

  const renderWindow = (win: Window, index: number) => {
    const [roomName, anchorStr = 'top-left'] = win.room.split(':') as [string, Anchor];
    const room = roomMap[roomName];
    if (!room) return null;

    const anchor = getCorner(room, anchorStr);
    const offset = win.offset || [0, 0];
    const posX = anchor.x + offset[0];
    const posY = anchor.y + offset[1];
    const x = mm(posX, scale);
    const y = mm(posY, scale);
    const w = mm(win.width, scale);
    const d = mm(win.depth || 100, scale); // Default depth 100mm
    const rot = win.rotation || 0;

    return (
      <g key={`window-${index}`} transform={`translate(${x},${y}) rotate(${rot})`}>
        <rect
          x={0}
          y={0}
          width={w}
          height={d}
          fill="lightblue"
          stroke="#444"
          strokeWidth="1"
        />
      </g>
    );
  };

  // Convert bounds to screen coordinates
  const viewBox = `${mm(bounds.x, scale)} ${mm(bounds.y, scale)} ${mm(bounds.width, scale)} ${mm(bounds.height, scale)}`;

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
