import { useEffect, useMemo, useState, useRef } from 'react';
import type { FloorplanData, ResolvedRoom, Door, Window, WallPosition, Anchor, Room } from '../types';
import { mm, resolveRoomPositions, resolveCompositeRoom, getCorner } from '../utils';

// Constants
const DOOR_THICKNESS = 100; // mm
const WINDOW_THICKNESS = 100; // mm
const BOUNDS_PADDING_PERCENTAGE = 0.1; // 10% padding on each side
const DEFAULT_OBJECT_SIZE = 1000; // mm
const DEFAULT_OBJECT_RADIUS = 500; // mm
const CORNER_GRAB_RADIUS = 300; // mm - distance from corner to detect hover/grab
const SNAP_DISTANCE = 500; // mm - distance to snap to another corner

interface FloorplanRendererProps {
  data: FloorplanData;
  onPositioningErrors?: (errors: string[]) => void;
  onRoomClick?: (roomId: string) => void;
  onDoorClick?: (doorIndex: number) => void;
  onWindowClick?: (windowIndex: number) => void;
  onRoomUpdate?: (updatedData: FloorplanData) => void;
}

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

// Helper function to calculate anchor offset for objects
function getObjectAnchorOffset(anchor: Anchor, width: number, height: number): { x: number; y: number } {
  switch (anchor) {
    case 'top-left':
      return { x: 0, y: 0 };
    case 'top-right':
      return { x: -width, y: 0 };
    case 'bottom-left':
      return { x: 0, y: -height };
    case 'bottom-right':
      return { x: -width, y: -height };
  }
}

export function FloorplanRenderer({ data, onPositioningErrors, onRoomClick, onDoorClick, onWindowClick, onRoomUpdate }: FloorplanRendererProps) {
  const gridStep = data.grid_step || 1000;
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag and hover state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<CornerHighlight | null>(null);
  const [snapTarget, setSnapTarget] = useState<CornerHighlight | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

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

      // Check room objects bounds
      if (room.objects) {
        room.objects.forEach(obj => {
          const roomAnchor = obj.roomAnchor || 'top-left';
          const roomCorner = getCorner(room, roomAnchor);

          // Direct addition - no direction inversion
          const absX = roomCorner.x + obj.x;
          const absY = roomCorner.y + obj.y;

          if (obj.type === 'circle') {
            const radius = obj.radius || DEFAULT_OBJECT_RADIUS;
            minX = Math.min(minX, absX - radius);
            minY = Math.min(minY, absY - radius);
            maxX = Math.max(maxX, absX + radius);
            maxY = Math.max(maxY, absY + radius);
          } else {
            // Square - calculate bounds including anchor offset
            const width = obj.width || DEFAULT_OBJECT_SIZE;
            const height = obj.height || DEFAULT_OBJECT_SIZE;
            const anchor = obj.anchor || 'top-left';
            const offset = getObjectAnchorOffset(anchor, width, height);

            const objX = absX + offset.x;
            const objY = absY + offset.y;
            minX = Math.min(minX, objX);
            minY = Math.min(minY, objY);
            maxX = Math.max(maxX, objX + width);
            maxY = Math.max(maxY, objY + height);
          }
        });
      }
    });

    // Add padding
    const width = maxX - minX;
    const depth = maxY - minY;
    const padding = Math.max(width, depth) * BOUNDS_PADDING_PERCENTAGE;

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

  // Convert SVG screen coordinates to mm coordinates
  const screenToMM = (screenX: number, screenY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };

    const pt = svgRef.current.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

    // Convert from screen units back to mm
    // mm() function does: val * DISPLAY_SCALE / 10 (where DISPLAY_SCALE = 1)
    // So to reverse: screen_val * 10
    return {
      x: svgPt.x * 10,
      y: svgPt.y * 10
    };
  };

  // Find which corner of a room is closest to a point
  const findClosestCorner = (room: ResolvedRoom, x: number, y: number): { corner: Anchor; distance: number } | null => {
    const corners: { corner: Anchor; x: number; y: number }[] = [
      { corner: 'top-left', x: room.x, y: room.y },
      { corner: 'top-right', x: room.x + room.width, y: room.y },
      { corner: 'bottom-left', x: room.x, y: room.y + room.depth },
      { corner: 'bottom-right', x: room.x + room.width, y: room.y + room.depth },
    ];

    let closest = null;
    let minDist = CORNER_GRAB_RADIUS;

    for (const c of corners) {
      const dist = Math.sqrt(Math.pow(c.x - x, 2) + Math.pow(c.y - y, 2));
      if (dist < minDist) {
        minDist = dist;
        closest = { corner: c.corner, distance: dist };
      }
    }

    return closest;
  };

  // Check if point is inside room center (not near corners)
  const isInsideRoomCenter = (room: ResolvedRoom, x: number, y: number): boolean => {
    if (x < room.x || x > room.x + room.width || y < room.y || y > room.y + room.depth) {
      return false;
    }
    // Make sure not near any corner
    const closest = findClosestCorner(room, x, y);
    return !closest;
  };

  // Check if point is inside room bounds (including parts)
  const isPointInRoom = (room: ResolvedRoom, x: number, y: number): boolean => {
    // Check main room
    if (x >= room.x && x <= room.x + room.width &&
        y >= room.y && y <= room.y + room.depth) {
      return true;
    }

    // Check parts
    const parts = resolveCompositeRoom(room);
    for (const part of parts) {
      if (x >= part.x && x <= part.x + part.width &&
          y >= part.y && y <= part.y + part.depth) {
        return true;
      }
    }

    return false;
  };

  // Mouse move handler for hover detection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = screenToMM(e.clientX, e.clientY);

    if (dragState) {
      // Handle dragging
      handleDragMove(x, y);
    } else {
      // Handle hover detection - only highlight the specific corner we're near
      let foundHover = false;

      // Find which room we're inside
      for (const room of Object.values(roomMap)) {
        if (isPointInRoom(room, x, y)) {
          // We're inside this room - check if we're near a corner
          const closest = findClosestCorner(room, x, y);
          if (closest) {
            // Near a corner - highlight ONLY that specific corner
            setHoveredCorner({ roomId: room.id, corner: closest.corner });
            foundHover = true;
          }
          break;
        }
      }

      if (!foundHover) {
        setHoveredCorner(null);
      }
    }
  };

  // Mouse down handler to start dragging
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>, roomId: string) => {
    e.stopPropagation();
    const { x, y } = screenToMM(e.clientX, e.clientY);
    const room = roomMap[roomId];
    if (!room) return;

    // Check if clicking on corner
    const closest = findClosestCorner(room, x, y);
    if (closest) {
      setDragState({
        roomId,
        dragType: 'corner',
        anchor: closest.corner,
        startMouseX: x,
        startMouseY: y,
        startRoomX: room.x,
        startRoomY: room.y,
      });
    } else if (isInsideRoomCenter(room, x, y)) {
      setDragState({
        roomId,
        dragType: 'center',
        startMouseX: x,
        startMouseY: y,
        startRoomX: room.x,
        startRoomY: room.y,
      });
    }
  };

  // Handle drag movement
  const handleDragMove = (x: number, y: number) => {
    if (!dragState) return;

    const room = roomMap[dragState.roomId];
    if (!room) return;

    let deltaX: number;
    let deltaY: number;

    if (dragState.dragType === 'corner' && dragState.anchor) {
      // When dragging by corner, calculate offset to move that corner to mouse position
      const cornerPos = getCorner(room, dragState.anchor);
      deltaX = x - cornerPos.x;
      deltaY = y - cornerPos.y;
    } else {
      // When dragging by center, use simple delta from start
      deltaX = x - dragState.startMouseX;
      deltaY = y - dragState.startMouseY;
    }

    // Update visual drag offset
    setDragOffset({ x: deltaX, y: deltaY });

    // Check for snap targets when dragging - only for the corner being dragged
    let foundSnap = false;
    if (dragState.dragType === 'corner' && dragState.anchor) {
      // The dragged corner should now be at mouse position (x, y)
      // because we calculated deltaX/Y to make corner move to mouse

      // Check all other rooms for snap targets
      for (const otherRoom of Object.values(roomMap)) {
        if (otherRoom.id === dragState.roomId) continue;

        const otherCorners: Anchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        for (const otherCorner of otherCorners) {
          const otherPos = getCorner(otherRoom, otherCorner);
          // Check distance from current mouse position (where dragged corner is)
          const dist = Math.sqrt(
            Math.pow(x - otherPos.x, 2) + Math.pow(y - otherPos.y, 2)
          );

          if (dist < SNAP_DISTANCE) {
            setSnapTarget({ roomId: otherRoom.id, corner: otherCorner });
            foundSnap = true;
            break;
          }
        }
        if (foundSnap) break;
      }
    }

    if (!foundSnap) {
      setSnapTarget(null);
    }
  };

  // Mouse up handler to finish dragging
  const handleMouseUp = () => {
    if (!dragState || !onRoomUpdate) {
      setDragState(null);
      setSnapTarget(null);
      setDragOffset(null);
      return;
    }

    const room = data.rooms.find(r => r.id === dragState.roomId);
    if (!room) {
      setDragState(null);
      setSnapTarget(null);
      setDragOffset(null);
      return;
    }

    const updatedRoom = { ...room };

    if (dragState.dragType === 'corner' && dragState.anchor && snapTarget) {
      // Snap to target corner
      updatedRoom.attachTo = `${snapTarget.roomId}:${snapTarget.corner}`;
      updatedRoom.anchor = dragState.anchor;
      delete updatedRoom.offset;
    } else if (dragState.dragType === 'corner' && dragState.anchor) {
      // Dropped corner without snap target - attach to zeropoint with offset
      const resolvedRoom = roomMap[dragState.roomId];
      if (resolvedRoom) {
        const cornerPos = getCorner(resolvedRoom, dragState.anchor);
        updatedRoom.attachTo = 'zeropoint:top-left';
        updatedRoom.anchor = dragState.anchor;
        updatedRoom.offset = [cornerPos.x, cornerPos.y];
      }
    } else if (dragState.dragType === 'center') {
      // Attach to zeropoint with offset
      const resolvedRoom = roomMap[dragState.roomId];
      if (resolvedRoom) {
        updatedRoom.attachTo = 'zeropoint:top-left';
        updatedRoom.anchor = 'top-left';
        updatedRoom.offset = [resolvedRoom.x, resolvedRoom.y];
      }
    }

    // Update the room in data
    const updatedRooms = data.rooms.map(r => r.id === dragState.roomId ? updatedRoom : r);
    onRoomUpdate({ ...data, rooms: updatedRooms });

    setDragState(null);
    setSnapTarget(null);
    setDragOffset(null);
  };

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState]);

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
            stroke="black"
            strokeWidth="2"
            onClick={() => onRoomClick?.(room.id)}
            onMouseDown={(e) => handleMouseDown(e as any, room.id)}
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
              stroke="black"
              strokeWidth="2"
              onClick={() => onRoomClick?.(room.id)}
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
            {room.name || room.id}
          </text>
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
          stroke="black"
          strokeWidth="2"
          onClick={() => onRoomClick?.(room.id)}
          onMouseDown={(e) => handleMouseDown(e as any, room.id)}
          style={{ cursor: dragState?.roomId === room.id ? 'grabbing' : 'grab' }}
        />

        {/* Room label */}
        <text
          x={mm(room.x + room.width / 2)}
          y={mm(room.y + room.depth / 2)}
          fontSize="14"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {room.name || room.id}
        </text>
      </g>
    );
  };

  const renderDoor = (door: Door, index: number) => {
    const [roomId, wallStr = 'left'] = door.room.split(':') as [string, WallPosition];
    const room = roomMap[roomId];
    if (!room) return null;

    const wall = wallStr as WallPosition;
    const offset = mm(door.offset ?? 0);
    const swing = door.swing || 'inwards-right';
    const w = mm(door.width);
    const d = mm(DOOR_THICKNESS);

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

    const doorType = door.type || 'normal';

    return (
      <g
        key={`door-${index}`}
        className="door-group"
        onClick={() => onDoorClick?.(index)}
        style={{ cursor: 'pointer' }}
      >
        {/* Door rectangle (always shown) */}
        <rect
          x={x + doorRect.x}
          y={y + doorRect.y}
          width={doorRect.width}
          height={doorRect.height}
          fill="saddlebrown"
          stroke="#333"
          strokeWidth="1"
        />
        {/* Door swing arc (only for normal doors) */}
        {doorType === 'normal' && (
          <path
            d={arcPath}
            transform={`translate(${x},${y})`}
            fill="none"
            stroke="#333"
            strokeWidth="1"
            strokeDasharray="4,2"
          />
        )}
      </g>
    );
  };

  const renderWindow = (win: Window, index: number) => {
    const [roomId, wallStr = 'top'] = win.room.split(':') as [string, WallPosition];
    const room = roomMap[roomId];
    if (!room) return null;

    const wall = wallStr as WallPosition;
    const offset = win.offset ?? 0;
    const w = mm(win.width);
    const d = mm(WINDOW_THICKNESS);

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
      <g
        key={`window-${index}`}
        className="window-group"
        transform={`translate(${x},${y}) rotate(${rotation})`}
        onClick={() => onWindowClick?.(index)}
        style={{ cursor: 'pointer' }}
      >
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

  // Render all room objects separately so they appear on top of all rooms
  const renderAllRoomObjects = () => {
    return Object.values(roomMap).map(room =>
      room.objects?.map((obj, idx) => {
        const roomAnchor = obj.roomAnchor || 'top-left';
        const roomCorner = getCorner(room, roomAnchor);
        const absX = roomCorner.x + obj.x;
        const absY = roomCorner.y + obj.y;
        const color = obj.color || '#888';

        if (obj.type === 'circle') {
          const radius = mm(obj.radius || DEFAULT_OBJECT_RADIUS);
          return (
            <g key={`${room.id}-obj-${idx}`}>
              <circle
                className="room-object"
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
                  fill="#000"
                >
                  {obj.text}
                </text>
              )}
            </g>
          );
        } else {
          // Square
          const width = obj.width || DEFAULT_OBJECT_SIZE;
          const height = obj.height || DEFAULT_OBJECT_SIZE;
          const anchor = obj.anchor || 'top-left';
          const offset = getObjectAnchorOffset(anchor, width, height);

          const rectX = mm(absX + offset.x);
          const rectY = mm(absY + offset.y);
          const w = mm(width);
          const h = mm(height);
          const centerX = rectX + w / 2;
          const centerY = rectY + h / 2;

          return (
            <g key={`${room.id}-obj-${idx}`}>
              <rect
                className="room-object"
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
                  fill="#000"
                >
                  {obj.text}
                </text>
              )}
            </g>
          );
        }
      })
    );
  };

  // Render corner highlights
  const renderCornerHighlights = () => {
    const highlights = [];

    // When dragging, show all corners of dragged room
    if (dragState) {
      const room = roomMap[dragState.roomId];
      if (room) {
        const corners: Anchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach((cornerType) => {
          const corner = getCorner(room, cornerType);

          const isGrabbedCorner = dragState.anchor === cornerType;

          // Apply drag offset
          let cornerX = corner.x;
          let cornerY = corner.y;
          if (dragOffset) {
            cornerX += dragOffset.x;
            cornerY += dragOffset.y;
          }

          highlights.push(
            <circle
              key={`corner-${dragState.roomId}-${cornerType}`}
              cx={mm(cornerX)}
              cy={mm(cornerY)}
              r={mm(isGrabbedCorner ? 200 : 150)}
              fill={isGrabbedCorner ? "rgba(100, 108, 255, 0.5)" : "rgba(100, 108, 255, 0.2)"}
              stroke="#646cff"
              strokeWidth={isGrabbedCorner ? "3" : "2"}
              pointerEvents="none"
            />
          );
        });
      }
    }
    // When hovering (not dragging), show only the single hovered corner
    else if (hoveredCorner) {
      const room = roomMap[hoveredCorner.roomId];
      if (room) {
        const corner = getCorner(room, hoveredCorner.corner);

        highlights.push(
          <circle
            key={`corner-${hoveredCorner.roomId}-${hoveredCorner.corner}`}
            cx={mm(corner.x)}
            cy={mm(corner.y)}
            r={mm(200)}
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

    return highlights;
  };

  return (
    <div className="preview-container">
      <svg
        ref={svgRef}
        className="floorplan-svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Grid */}
        {renderGrid()}

        {/* Rooms (without objects) */}
        {Object.values(roomMap).map(renderRoom)}

        {/* Doors */}
        {data.doors?.map(renderDoor)}

        {/* Windows */}
        {data.windows?.map(renderWindow)}

        {/* All room objects - rendered last so they appear on top */}
        {renderAllRoomObjects()}

        {/* Corner highlights - rendered on top */}
        {renderCornerHighlights()}
      </svg>
    </div>
  );
}
