import { useEffect, useMemo, useState, useRef } from 'react';
import type { FloorplanData, ResolvedRoom, Anchor } from '../types';
import { mm, resolveRoomPositions, resolveCompositeRoom, getCorner } from '../utils';
import { GridRenderer } from './floorplan/GridRenderer';
import { RoomRenderer } from './floorplan/RoomRenderer';
import { DoorRenderer } from './floorplan/DoorRenderer';
import { WindowRenderer } from './floorplan/WindowRenderer';
import { RoomObjectsRenderer } from './floorplan/RoomObjectsRenderer';
import { CornerHighlights } from './floorplan/CornerHighlights';

// Constants
const BOUNDS_PADDING_PERCENTAGE = 0.1; // 10% padding on each side
const DEFAULT_OBJECT_SIZE = 1000; // mm
const DEFAULT_OBJECT_RADIUS = 500; // mm
const CORNER_GRAB_RADIUS = 600; // mm - distance from corner to detect hover/grab
const SNAP_DISTANCE = 500; // mm - distance to snap to another corner

interface FloorplanRendererProps {
  data: FloorplanData;
  onPositioningErrors?: (errors: string[]) => void;
  onRoomClick?: (roomId: string) => void;
  onDoorClick?: (doorIndex: number) => void;
  onWindowClick?: (windowIndex: number) => void;
  onRoomUpdate?: (updatedData: FloorplanData) => void;
  onRoomNameUpdate?: (roomId: string, newName: string) => void;
  onObjectClick?: (roomId: string, objectIndex: number) => void;
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

export function FloorplanRenderer({ data, onPositioningErrors, onRoomClick, onDoorClick, onWindowClick, onRoomUpdate, onRoomNameUpdate, onObjectClick }: FloorplanRendererProps) {
  const gridStep = data.grid_step || 1000;
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag and hover state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<CornerHighlight | null>(null);
  const [snapTarget, setSnapTarget] = useState<CornerHighlight | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [connectedRooms, setConnectedRooms] = useState<Set<string>>(new Set());

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

  // Find all rooms that are attached to the given room (directly or indirectly)
  const findConnectedRooms = (rootRoomId: string): Set<string> => {
    const connected = new Set<string>();
    const toCheck = [rootRoomId];

    while (toCheck.length > 0) {
      const currentId = toCheck.pop()!;
      if (connected.has(currentId)) continue;
      connected.add(currentId);

      // Find rooms that attach to this room
      data.rooms.forEach(room => {
        const attachTo = room.attachTo?.split(':')[0];
        if (attachTo === currentId && !connected.has(room.id)) {
          toCheck.push(room.id);
        }
      });
    }

    // Remove the root room itself from the set
    connected.delete(rootRoomId);
    return connected;
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
  const handleMouseDown = (e: React.MouseEvent<SVGElement>, roomId: string) => {
    e.stopPropagation();
    const { x, y } = screenToMM(e.clientX, e.clientY);
    const room = roomMap[roomId];
    if (!room) return;

    // Find all rooms connected to this one
    const connected = findConnectedRooms(roomId);
    setConnectedRooms(connected);

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
      setConnectedRooms(new Set());
      return;
    }

    const room = data.rooms.find(r => r.id === dragState.roomId);
    if (!room) {
      setDragState(null);
      setSnapTarget(null);
      setDragOffset(null);
      return;
    }

    // Check if the room actually moved significantly (more than 100mm)
    const MOVEMENT_THRESHOLD = 100; // mm
    const hasMoved = dragOffset && (
      Math.abs(dragOffset.x) > MOVEMENT_THRESHOLD ||
      Math.abs(dragOffset.y) > MOVEMENT_THRESHOLD
    );

    const updatedRoom = { ...room };
    const resolvedRoom = roomMap[dragState.roomId];

    if (dragState.dragType === 'corner' && dragState.anchor && snapTarget && hasMoved) {
      // Only change attachment if moved significantly AND there's a snap target
      updatedRoom.attachTo = `${snapTarget.roomId}:${snapTarget.corner}`;
      updatedRoom.anchor = dragState.anchor;
      delete updatedRoom.offset;
    } else if (dragState.dragType === 'corner' && dragState.anchor && !snapTarget && hasMoved) {
      // Moved significantly but no snap target - attach to zeropoint with offset
      if (resolvedRoom && dragOffset) {
        const cornerPos = getCorner(resolvedRoom, dragState.anchor);
        const newCornerX = cornerPos.x + dragOffset.x;
        const newCornerY = cornerPos.y + dragOffset.y;
        updatedRoom.attachTo = 'zeropoint:top-left';
        updatedRoom.anchor = dragState.anchor;
        updatedRoom.offset = [newCornerX, newCornerY];
      }
    } else if (dragState.dragType === 'corner' && dragState.anchor && !hasMoved) {
      // Tiny movement - adjust offset but keep existing attachment
      if (resolvedRoom && dragOffset && room.attachTo) {
        // Calculate new offset based on current attachment
        if (room.attachTo.startsWith('zeropoint:')) {
          // Already attached to zeropoint, adjust the offset
          const cornerPos = getCorner(resolvedRoom, dragState.anchor);
          const newCornerX = cornerPos.x + dragOffset.x;
          const newCornerY = cornerPos.y + dragOffset.y;
          updatedRoom.offset = [newCornerX, newCornerY];
        } else {
          // Attached to another room - convert to zeropoint with current position
          const cornerPos = getCorner(resolvedRoom, dragState.anchor);
          const newCornerX = cornerPos.x + dragOffset.x;
          const newCornerY = cornerPos.y + dragOffset.y;
          updatedRoom.attachTo = 'zeropoint:top-left';
          updatedRoom.anchor = dragState.anchor;
          updatedRoom.offset = [newCornerX, newCornerY];
        }
      }
    } else if (dragState.dragType === 'center' && hasMoved) {
      // Center drag with significant movement - attach to zeropoint with offset
      if (resolvedRoom && dragOffset) {
        const newX = resolvedRoom.x + dragOffset.x;
        const newY = resolvedRoom.y + dragOffset.y;
        updatedRoom.attachTo = 'zeropoint:top-left';
        updatedRoom.anchor = 'top-left';
        updatedRoom.offset = [newX, newY];
      }
    } else if (dragState.dragType === 'center' && !hasMoved) {
      // Tiny center movement - adjust offset but keep existing attachment
      if (resolvedRoom && dragOffset) {
        if (room.attachTo?.startsWith('zeropoint:')) {
          // Already at zeropoint, adjust offset
          const newX = resolvedRoom.x + dragOffset.x;
          const newY = resolvedRoom.y + dragOffset.y;
          updatedRoom.offset = [newX, newY];
        } else {
          // Attached to another room - convert to zeropoint
          const newX = resolvedRoom.x + dragOffset.x;
          const newY = resolvedRoom.y + dragOffset.y;
          updatedRoom.attachTo = 'zeropoint:top-left';
          updatedRoom.anchor = 'top-left';
          updatedRoom.offset = [newX, newY];
        }
      }
    }

    // Only update if there were actual changes
    if (!hasMoved && !dragOffset) {
      setDragState(null);
      setSnapTarget(null);
      setDragOffset(null);
      return;
    }

    // Update the room in data
    const updatedRooms = data.rooms.map(r => r.id === dragState.roomId ? updatedRoom : r);
    onRoomUpdate({ ...data, rooms: updatedRooms });

    setDragState(null);
    setSnapTarget(null);
    setDragOffset(null);
    setConnectedRooms(new Set());
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





  // Convert bounds to screen coordinates
  const viewBox = `${mm(bounds.x)} ${mm(bounds.y)} ${mm(bounds.width)} ${mm(bounds.depth)}`;

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
        <GridRenderer
          gridMinX={gridMinX}
          gridMinY={gridMinY}
          gridMaxX={gridMaxX}
          gridMaxY={gridMaxY}
          gridStep={gridStep}
          mm={mm}
        />

        {/* Rooms (without objects) */}
        {Object.values(roomMap).map(room => (
          <RoomRenderer
            key={room.id}
            room={room}
            dragState={dragState}
            dragOffset={dragOffset}
            hoveredCorner={hoveredCorner}
            isConnected={connectedRooms.has(room.id)}
            mm={mm}
            resolveCompositeRoom={resolveCompositeRoom}
            getCorner={getCorner}
            onMouseDown={handleMouseDown}
            onClick={onRoomClick}
            onNameUpdate={onRoomNameUpdate}
          />
        ))}

        {/* Doors */}
        {data.doors?.map((door, index) => {
          const roomId = door.room.split(':')[0];
          const isDragging = dragState?.roomId === roomId;
          const transform = isDragging && dragOffset
            ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
            : undefined;
          return (
            <g key={`door-${index}`} transform={transform}>
              <DoorRenderer
                door={door}
                index={index}
                roomMap={roomMap}
                mm={mm}
                onClick={onDoorClick}
              />
            </g>
          );
        })}

        {/* Windows */}
        {data.windows?.map((window, index) => {
          const roomId = window.room.split(':')[0];
          const isDragging = dragState?.roomId === roomId;
          const transform = isDragging && dragOffset
            ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
            : undefined;
          return (
            <g key={`window-${index}`} transform={transform}>
              <WindowRenderer
                window={window}
                index={index}
                roomMap={roomMap}
                mm={mm}
                onClick={onWindowClick}
              />
            </g>
          );
        })}

        {/* All room objects - rendered last so they appear on top */}
        <RoomObjectsRenderer
          roomMap={roomMap}
          dragState={dragState}
          dragOffset={dragOffset}
          mm={mm}
          getCorner={getCorner}
          onObjectClick={onObjectClick}
        />

        {/* Corner highlights - rendered on top */}
        <CornerHighlights
          roomMap={roomMap}
          hoveredCorner={hoveredCorner}
          dragState={dragState}
          snapTarget={snapTarget}
          mm={mm}
          getCorner={getCorner}
          dragOffset={dragOffset}
        />
      </svg>
    </div>
  );
}
