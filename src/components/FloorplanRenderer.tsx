import { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import type { FloorplanData, ResolvedRoom, Anchor, WallPosition } from '../types';
import { mm, resolveRoomPositions, resolveCompositeRoom, getCorner } from '../utils';
import { GridRenderer } from './floorplan/GridRenderer';
import { RoomRenderer } from './floorplan/RoomRenderer';
import { DoorRenderer } from './floorplan/DoorRenderer';
import { WindowRenderer } from './floorplan/WindowRenderer';
import { RoomObjectsRenderer } from './floorplan/RoomObjectsRenderer';
import { FreestandingObjectsRenderer } from './floorplan/FreestandingObjectsRenderer';
import { FreestandingDoorsRenderer } from './floorplan/FreestandingDoorsRenderer';
import { FreestandingWindowsRenderer } from './floorplan/FreestandingWindowsRenderer';
import { CornerHighlights } from './floorplan/CornerHighlights';
import { ResizeHandles, type ResizeEdge } from './floorplan/ResizeHandles';

// Constants
const BOUNDS_PADDING_PERCENTAGE = 0.1; // 10% padding on each side
const DEFAULT_OBJECT_SIZE = 1000; // mm
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
  onDoorDragUpdate?: (
    doorIndex: number,
    roomId: string | null,
    wall: WallPosition | null,
    offset: number,
    x: number,
    y: number
  ) => void;
  onWindowDragUpdate?: (
    windowIndex: number,
    roomId: string | null,
    wall: WallPosition | null,
    offset: number,
    x: number,
    y: number
  ) => void;
  onObjectDragUpdate?: (
    sourceRoomId: string,
    objectIndex: number,
    targetRoomId: string,
    newX: number,
    newY: number
  ) => void;
  onFreestandingObjectDragUpdate?: (
    objectIndex: number,
    targetRoomId: string,
    newX: number,
    newY: number
  ) => void;
  onFreestandingDoorDragUpdate?: (
    doorIndex: number,
    roomId: string | null,
    wall: WallPosition | null,
    offset: number,
    x: number,
    y: number
  ) => void;
  onFreestandingWindowDragUpdate?: (
    windowIndex: number,
    roomId: string | null,
    wall: WallPosition | null,
    offset: number,
    x: number,
    y: number
  ) => void;
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
function getObjectAnchorOffset(
  anchor: Anchor,
  width: number,
  height: number
): { x: number; y: number } {
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

const FloorplanRendererComponent = ({
  data,
  onPositioningErrors,
  onRoomClick,
  onDoorClick,
  onWindowClick,
  onRoomUpdate,
  onRoomNameUpdate,
  onObjectClick,
  onDoorDragUpdate,
  onWindowDragUpdate,
  onObjectDragUpdate,
  onFreestandingObjectDragUpdate,
  onFreestandingDoorDragUpdate,
  onFreestandingWindowDragUpdate,
}: FloorplanRendererProps) => {
  const gridStep = data.grid_step || 1000;
  const svgRef = useRef<SVGSVGElement>(null);

  // Drag and hover state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<CornerHighlight | null>(null);
  const [snapTarget, setSnapTarget] = useState<CornerHighlight | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [connectedRooms, setConnectedRooms] = useState<Set<string>>(new Set());

  // Resize state
  const [resizeState, setResizeState] = useState<{
    roomId: string;
    edge: ResizeEdge;
    startMouseX: number;
    startMouseY: number;
    startWidth: number;
    startDepth: number;
    startX: number;
    startY: number;
  } | null>(null);
  const resizeStateRef = useRef(resizeState);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  // Object resize state
  const [objectResizeState, setObjectResizeState] = useState<{
    roomId: string;
    objectIndex: number;
    partId?: string;
    corner: Anchor;
    startMouseX: number;
    startMouseY: number;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
  } | null>(null);
  const objectResizeStateRef = useRef(objectResizeState);
  const [hoveredObject, setHoveredObject] = useState<{
    roomId: string;
    objectIndex: number;
    partId?: string;
  } | null>(null);

  // Use ref to track animation frame for drag updates
  const dragAnimationFrame = useRef<number | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    resizeStateRef.current = resizeState;
  }, [resizeState]);

  useEffect(() => {
    objectResizeStateRef.current = objectResizeState;
  }, [objectResizeState]);

  // Memoize room resolution to avoid recalculating on every render
  const { roomMap, errors, partIds, partToParent } = useMemo(() => {
    const result = resolveRoomPositions(data.rooms);

    // Add virtual zeropoint "room" for freestanding elements
    result.roomMap['zeropoint'] = {
      id: 'zeropoint',
      x: 0,
      y: 0,
      width: 0,
      depth: 0,
      attachTo: 'zeropoint:top-left',
    };

    return result;
  }, [data.rooms]);

  // Notify parent component of positioning errors
  useEffect(() => {
    if (onPositioningErrors) {
      onPositioningErrors(errors);
    }
  }, [errors, onPositioningErrors]);

  // Memoize composite room parts to avoid recalculating on every render
  // ResolvedPart has x, y, width, depth properties just like ResolvedRoom
  const compositeRoomPartsMap = useMemo(() => {
    const partsMap = new Map<
      string,
      Array<{ x: number; y: number; width: number; depth: number }>
    >();
    Object.values(roomMap).forEach(room => {
      partsMap.set(room.id, resolveCompositeRoom(room));
    });
    return partsMap;
  }, [roomMap]);

  // Memoize bounds calculation to avoid recalculating on every render
  const bounds = useMemo(() => {
    if (Object.keys(roomMap).length === 0) {
      return { x: 0, y: 0, width: 10000, depth: 10000 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    Object.values(roomMap).forEach(room => {
      const parts = compositeRoomPartsMap.get(room.id) || [];

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
          // Anchor determines both which room corner AND which object point
          const anchor = obj.anchor || 'top-left';
          const roomCorner = getCorner(room, anchor);

          // Object position is: room corner + x,y offset
          const absX = roomCorner.x + obj.x;
          const absY = roomCorner.y + obj.y;

          if (obj.type === 'circle') {
            // For circles, width represents the diameter
            const diameter = obj.width || DEFAULT_OBJECT_SIZE;
            const radius = diameter / 2;

            // Apply object anchor offset to position the circle
            const objOffset = getObjectAnchorOffset(anchor, diameter, diameter);
            const centerX = absX + objOffset.x + radius;
            const centerY = absY + objOffset.y + radius;

            minX = Math.min(minX, centerX - radius);
            minY = Math.min(minY, centerY - radius);
            maxX = Math.max(maxX, centerX + radius);
            maxY = Math.max(maxY, centerY + radius);
          } else {
            // Square - calculate bounds including anchor offset
            const width = obj.width || DEFAULT_OBJECT_SIZE;
            const height = obj.height || width;
            const objOffset = getObjectAnchorOffset(anchor, width, height);

            const objX = absX + objOffset.x;
            const objY = absY + objOffset.y;
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
      depth: depth + padding * 2,
    };
  }, [roomMap, compositeRoomPartsMap]);

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
      y: svgPt.y * 10,
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
  const findClosestCorner = (
    room: ResolvedRoom,
    x: number,
    y: number
  ): { corner: Anchor; distance: number } | null => {
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
  const isPointInRoom = useCallback(
    (room: ResolvedRoom, x: number, y: number): boolean => {
      // Check main room
      if (x >= room.x && x <= room.x + room.width && y >= room.y && y <= room.y + room.depth) {
        return true;
      }

      // Check parts - use memoized parts
      const parts = compositeRoomPartsMap.get(room.id) || [];
      for (const part of parts) {
        if (x >= part.x && x <= part.x + part.width && y >= part.y && y <= part.y + part.depth) {
          return true;
        }
      }

      return false;
    },
    [compositeRoomPartsMap]
  );

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

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    // Just clear the resize state - the final update was already done in handleResizeMove
    setResizeState(null);
  }, []);

  // Handle resize movement
  const handleResizeMove = useCallback(
    (x: number, y: number) => {
      const currentResizeState = resizeStateRef.current;
      if (!currentResizeState) return;

      const room = roomMap[currentResizeState.roomId];
      if (!room) return;

      // Initialize start position on first move
      if (currentResizeState.startMouseX === 0 && currentResizeState.startMouseY === 0) {
        setResizeState({
          ...currentResizeState,
          startMouseX: x,
          startMouseY: y,
        });
        return;
      }

      // Calculate delta from start position
      const deltaX = x - currentResizeState.startMouseX;
      const deltaY = y - currentResizeState.startMouseY;

      // Calculate new dimensions based on which edge is being dragged
      const MIN_SIZE = 500; // mm - minimum room dimension

      let newWidth = currentResizeState.startWidth;
      let newDepth = currentResizeState.startDepth;

      switch (currentResizeState.edge) {
        case 'right':
          newWidth = Math.round(Math.max(MIN_SIZE, currentResizeState.startWidth + deltaX));
          break;
        case 'left':
          newWidth = Math.round(Math.max(MIN_SIZE, currentResizeState.startWidth - deltaX));
          break;
        case 'bottom':
          newDepth = Math.round(Math.max(MIN_SIZE, currentResizeState.startDepth + deltaY));
          break;
        case 'top':
          newDepth = Math.round(Math.max(MIN_SIZE, currentResizeState.startDepth - deltaY));
          break;
      }

      // Update the room in data to show live resize feedback
      if (onRoomUpdate) {
        const roomData = data.rooms.find(r => r.id === currentResizeState.roomId);
        if (roomData) {
          const updatedRoom = { ...roomData };
          updatedRoom.width = newWidth;
          updatedRoom.depth = newDepth;

          // If left or top edge, also adjust position
          if (currentResizeState.edge === 'left' || currentResizeState.edge === 'top') {
            const deltaX =
              currentResizeState.edge === 'left' ? currentResizeState.startWidth - newWidth : 0;
            const deltaY =
              currentResizeState.edge === 'top' ? currentResizeState.startDepth - newDepth : 0;

            const newX = Math.round(currentResizeState.startX + deltaX);
            const newY = Math.round(currentResizeState.startY + deltaY);
            updatedRoom.attachTo = 'zeropoint:top-left';
            updatedRoom.anchor = 'top-left';
            updatedRoom.offset = [newX, newY];
          }

          const updatedRooms = data.rooms.map(r =>
            r.id === currentResizeState.roomId ? updatedRoom : r
          );
          onRoomUpdate({ ...data, rooms: updatedRooms });
        }
      }
    },
    [roomMap, data, onRoomUpdate]
  );

  // Resize start handler
  const handleResizeStart = useCallback(
    (roomId: string, edge: ResizeEdge) => {
      const room = roomMap[roomId];
      if (!room) return;

      // Get initial mouse position
      const svgElement = svgRef.current;
      if (!svgElement) return;

      const handleMouseMove = (e: MouseEvent) => {
        const { x, y } = screenToMM(e.clientX, e.clientY);
        handleResizeMove(x, y);
      };

      const handleMouseUp = () => {
        handleResizeEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Set initial resize state (will be updated with actual mouse position on first move)
      setResizeState({
        roomId,
        edge,
        startMouseX: 0, // Will be set on first move
        startMouseY: 0, // Will be set on first move
        startWidth: room.width,
        startDepth: room.depth,
        startX: room.x,
        startY: room.y,
      });
    },
    [roomMap, handleResizeMove, handleResizeEnd]
  );

  // Handle numeric resize (double-click on handle)
  const handleResizeNumeric = useCallback(
    (roomId: string, edge: ResizeEdge, currentValue: number) => {
      if (!onRoomUpdate) return;

      const dimensionName = edge === 'left' || edge === 'right' ? 'width' : 'depth';
      const promptMessage = `Enter new ${dimensionName} in mm (current: ${currentValue}mm):`;
      const input = window.prompt(promptMessage, currentValue.toString());

      if (input === null) return; // User cancelled

      const newValue = parseInt(input, 10);
      if (isNaN(newValue) || newValue < 500) {
        alert('Please enter a valid number (minimum 500mm)');
        return;
      }

      const room = data.rooms.find(r => r.id === roomId);
      if (!room) return;

      const resolvedRoom = roomMap[roomId];
      if (!resolvedRoom) return;

      const updatedRoom = { ...room };

      // Update the appropriate dimension
      if (edge === 'left' || edge === 'right') {
        const widthDelta = newValue - room.width;
        updatedRoom.width = newValue;

        // If left edge, adjust position to keep right edge fixed
        if (edge === 'left') {
          const newX = resolvedRoom.x - widthDelta;
          updatedRoom.attachTo = 'zeropoint:top-left';
          updatedRoom.anchor = 'top-left';
          updatedRoom.offset = [newX, resolvedRoom.y];
        }
      } else {
        // top or bottom
        const depthDelta = newValue - room.depth;
        updatedRoom.depth = newValue;

        // If top edge, adjust position to keep bottom edge fixed
        if (edge === 'top') {
          const newY = resolvedRoom.y - depthDelta;
          updatedRoom.attachTo = 'zeropoint:top-left';
          updatedRoom.anchor = 'top-left';
          updatedRoom.offset = [resolvedRoom.x, newY];
        }
      }

      const updatedRooms = data.rooms.map(r => (r.id === roomId ? updatedRoom : r));
      onRoomUpdate({ ...data, rooms: updatedRooms });
    },
    [data, roomMap, onRoomUpdate]
  );

  // Handle dimensions update (double-click on dimensions text)
  const handleRoomDimensionsUpdate = useCallback(
    (roomId: string, newWidth: number, newDepth: number) => {
      if (!onRoomUpdate) return;

      const room = data.rooms.find(r => r.id === roomId);
      if (!room) return;

      const updatedRoom = { ...room, width: newWidth, depth: newDepth };
      const updatedRooms = data.rooms.map(r => (r.id === roomId ? updatedRoom : r));
      onRoomUpdate({ ...data, rooms: updatedRooms });
    },
    [data, onRoomUpdate]
  );

  // Object resize handlers
  const handleObjectResizeEnd = useCallback(() => {
    setObjectResizeState(null);
  }, []);

  const handleObjectResizeMove = useCallback(
    (x: number, y: number) => {
      const currentObjectResizeState = objectResizeStateRef.current;
      if (!currentObjectResizeState) return;

      const room = roomMap[currentObjectResizeState.roomId];
      if (!room) return;

      // Initialize start position on first move
      if (
        currentObjectResizeState.startMouseX === 0 &&
        currentObjectResizeState.startMouseY === 0
      ) {
        setObjectResizeState({
          ...currentObjectResizeState,
          startMouseX: x,
          startMouseY: y,
        });
        return;
      }

      // Calculate delta from start position
      const deltaX = x - currentObjectResizeState.startMouseX;
      const deltaY = y - currentObjectResizeState.startMouseY;

      // Minimum object size
      const MIN_SIZE = 100; // mm

      // Find the object (either in room or in part)
      let objects = room.objects;

      if (currentObjectResizeState.partId && room.parts) {
        const partIndex = room.parts.findIndex(p => p.id === currentObjectResizeState.partId);
        if (partIndex >= 0 && room.parts[partIndex].objects) {
          objects = room.parts[partIndex].objects;
        }
      }

      if (!objects || !objects[currentObjectResizeState.objectIndex]) return;

      const obj = objects[currentObjectResizeState.objectIndex];
      const isCircle = obj.type === 'circle';

      let newWidth = currentObjectResizeState.startWidth;
      let newHeight = currentObjectResizeState.startHeight;

      if (isCircle) {
        // For circles, resize proportionally based on diagonal distance
        const diagonal = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const deltaSize = Math.round(diagonal * Math.sign(deltaX + deltaY));
        newWidth = Math.max(MIN_SIZE, currentObjectResizeState.startWidth + deltaSize);
        newHeight = newWidth; // Keep it circular
      } else {
        // For squares, resize based on corner
        const corner = currentObjectResizeState.corner;

        switch (corner) {
          case 'bottom-right':
            newWidth = Math.max(MIN_SIZE, Math.round(currentObjectResizeState.startWidth + deltaX));
            newHeight = Math.max(
              MIN_SIZE,
              Math.round(currentObjectResizeState.startHeight + deltaY)
            );
            break;
          case 'bottom-left':
            newWidth = Math.max(MIN_SIZE, Math.round(currentObjectResizeState.startWidth - deltaX));
            newHeight = Math.max(
              MIN_SIZE,
              Math.round(currentObjectResizeState.startHeight + deltaY)
            );
            break;
          case 'top-right':
            newWidth = Math.max(MIN_SIZE, Math.round(currentObjectResizeState.startWidth + deltaX));
            newHeight = Math.max(
              MIN_SIZE,
              Math.round(currentObjectResizeState.startHeight - deltaY)
            );
            break;
          case 'top-left':
            newWidth = Math.max(MIN_SIZE, Math.round(currentObjectResizeState.startWidth - deltaX));
            newHeight = Math.max(
              MIN_SIZE,
              Math.round(currentObjectResizeState.startHeight - deltaY)
            );
            break;
        }
      }

      // Update the object
      if (onRoomUpdate) {
        const roomData = data.rooms.find(r => r.id === currentObjectResizeState.roomId);
        if (roomData) {
          const updatedRoom = { ...roomData };

          if (currentObjectResizeState.partId && updatedRoom.parts) {
            const partIdx = updatedRoom.parts.findIndex(
              p => p.id === currentObjectResizeState.partId
            );
            if (partIdx >= 0 && updatedRoom.parts[partIdx].objects) {
              const updatedParts = [...updatedRoom.parts];
              const updatedPart = { ...updatedParts[partIdx] };
              const updatedObjects = [...(updatedPart.objects || [])];
              updatedObjects[currentObjectResizeState.objectIndex] = {
                ...updatedObjects[currentObjectResizeState.objectIndex],
                width: newWidth,
                height: isCircle ? undefined : newHeight,
              };
              updatedPart.objects = updatedObjects;
              updatedParts[partIdx] = updatedPart;
              updatedRoom.parts = updatedParts;
            }
          } else if (updatedRoom.objects) {
            const updatedObjects = [...updatedRoom.objects];
            updatedObjects[currentObjectResizeState.objectIndex] = {
              ...updatedObjects[currentObjectResizeState.objectIndex],
              width: newWidth,
              height: isCircle ? undefined : newHeight,
            };
            updatedRoom.objects = updatedObjects;
          }

          const updatedRooms = data.rooms.map(r =>
            r.id === currentObjectResizeState.roomId ? updatedRoom : r
          );
          onRoomUpdate({ ...data, rooms: updatedRooms });
        }
      }
    },
    [roomMap, data, onRoomUpdate]
  );

  const handleObjectResizeStart = useCallback(
    (roomId: string, objectIndex: number, corner: Anchor, partId?: string) => {
      const room = roomMap[roomId];
      if (!room) return;

      // Find the object
      let objects = room.objects;
      if (partId && room.parts) {
        const part = room.parts.find(p => p.id === partId);
        if (part && part.objects) {
          objects = part.objects;
        }
      }

      if (!objects || !objects[objectIndex]) return;

      const obj = objects[objectIndex];
      const objWidth = obj.width || DEFAULT_OBJECT_SIZE;
      const objHeight = obj.type === 'circle' ? objWidth : obj.height || objWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const { x, y } = screenToMM(e.clientX, e.clientY);
        handleObjectResizeMove(x, y);
      };

      const handleMouseUp = () => {
        handleObjectResizeEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      setObjectResizeState({
        roomId,
        objectIndex,
        partId,
        corner,
        startMouseX: 0,
        startMouseY: 0,
        startWidth: objWidth,
        startHeight: objHeight,
        startX: obj.x,
        startY: obj.y,
      });
    },
    [roomMap, handleObjectResizeMove, handleObjectResizeEnd, screenToMM]
  );

  const handleObjectResizeNumeric = useCallback(
    (
      roomId: string,
      objectIndex: number,
      corner: Anchor,
      currentWidth: number,
      currentHeight?: number,
      partId?: string
    ) => {
      if (!onRoomUpdate) return;

      const room = roomMap[roomId];
      if (!room) return;

      // Find the object
      let objects = room.objects;
      if (partId && room.parts) {
        const part = room.parts.find(p => p.id === partId);
        if (part && part.objects) {
          objects = part.objects;
        }
      }

      if (!objects || !objects[objectIndex]) return;

      const obj = objects[objectIndex];
      const isCircle = obj.type === 'circle';

      let input: string | null;
      if (isCircle) {
        const promptMessage = `Enter new diameter in mm (current: ${currentWidth}mm):`;
        input = window.prompt(promptMessage, currentWidth.toString());

        if (input === null) return; // User cancelled

        const newDiameter = parseInt(input, 10);
        if (isNaN(newDiameter) || newDiameter < 100) {
          alert('Please enter a valid number (minimum 100mm)');
          return;
        }

        // Update the circle
        const roomData = data.rooms.find(r => r.id === roomId);
        if (roomData) {
          const updatedRoom = { ...roomData };

          if (partId && updatedRoom.parts) {
            const partIdx = updatedRoom.parts.findIndex(p => p.id === partId);
            if (partIdx >= 0 && updatedRoom.parts[partIdx].objects) {
              const updatedParts = [...updatedRoom.parts];
              const updatedPart = { ...updatedParts[partIdx] };
              const updatedObjects = [...(updatedPart.objects || [])];
              updatedObjects[objectIndex] = {
                ...updatedObjects[objectIndex],
                width: newDiameter,
              };
              updatedPart.objects = updatedObjects;
              updatedParts[partIdx] = updatedPart;
              updatedRoom.parts = updatedParts;
            }
          } else if (updatedRoom.objects) {
            const updatedObjects = [...updatedRoom.objects];
            updatedObjects[objectIndex] = {
              ...updatedObjects[objectIndex],
              width: newDiameter,
            };
            updatedRoom.objects = updatedObjects;
          }

          const updatedRooms = data.rooms.map(r => (r.id === roomId ? updatedRoom : r));
          onRoomUpdate({ ...data, rooms: updatedRooms });
        }
      } else {
        // Square - prompt for width x height
        const promptMessage = `Enter new dimensions in mm (format: WxH, current: ${currentWidth}x${currentHeight}):`;
        input = window.prompt(promptMessage, `${currentWidth}x${currentHeight}`);

        if (input === null) return; // User cancelled

        const match = input.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
        if (!match) {
          alert('Please enter dimensions in format: WxH (e.g., 1000x800)');
          return;
        }

        const newWidth = parseInt(match[1], 10);
        const newHeight = parseInt(match[2], 10);

        if (isNaN(newWidth) || isNaN(newHeight) || newWidth < 100 || newHeight < 100) {
          alert('Please enter valid numbers (minimum 100mm each)');
          return;
        }

        // Update the square
        const roomData = data.rooms.find(r => r.id === roomId);
        if (roomData) {
          const updatedRoom = { ...roomData };

          if (partId && updatedRoom.parts) {
            const partIdx = updatedRoom.parts.findIndex(p => p.id === partId);
            if (partIdx >= 0 && updatedRoom.parts[partIdx].objects) {
              const updatedParts = [...updatedRoom.parts];
              const updatedPart = { ...updatedParts[partIdx] };
              const updatedObjects = [...(updatedPart.objects || [])];
              updatedObjects[objectIndex] = {
                ...updatedObjects[objectIndex],
                width: newWidth,
                height: newHeight,
              };
              updatedPart.objects = updatedObjects;
              updatedParts[partIdx] = updatedPart;
              updatedRoom.parts = updatedParts;
            }
          } else if (updatedRoom.objects) {
            const updatedObjects = [...updatedRoom.objects];
            updatedObjects[objectIndex] = {
              ...updatedObjects[objectIndex],
              width: newWidth,
              height: newHeight,
            };
            updatedRoom.objects = updatedObjects;
          }

          const updatedRooms = data.rooms.map(r => (r.id === roomId ? updatedRoom : r));
          onRoomUpdate({ ...data, rooms: updatedRooms });
        }
      }
    },
    [data, roomMap, onRoomUpdate]
  );

  // Handle drag movement with requestAnimationFrame for smooth performance
  const handleDragMove = useCallback(
    (x: number, y: number) => {
      if (!dragState) return;

      const room = roomMap[dragState.roomId];
      if (!room) return;

      // Cancel any pending animation frame
      if (dragAnimationFrame.current !== null) {
        cancelAnimationFrame(dragAnimationFrame.current);
      }

      // Schedule update for next animation frame
      dragAnimationFrame.current = requestAnimationFrame(() => {
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

        // Check for snap targets when dragging - only for the corner being dragged
        let foundSnap = false;
        let newSnapTarget: CornerHighlight | null = null;

        if (dragState.dragType === 'corner' && dragState.anchor) {
          // Check all other rooms for snap targets
          for (const otherRoom of Object.values(roomMap)) {
            if (otherRoom.id === dragState.roomId) continue;

            const otherCorners: Anchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
            for (const otherCorner of otherCorners) {
              const otherPos = getCorner(otherRoom, otherCorner);
              // Check distance from current mouse position (where dragged corner is)
              const dist = Math.sqrt(Math.pow(x - otherPos.x, 2) + Math.pow(y - otherPos.y, 2));

              if (dist < SNAP_DISTANCE) {
                newSnapTarget = { roomId: otherRoom.id, corner: otherCorner };
                foundSnap = true;
                break;
              }
            }
            if (foundSnap) break;
          }
        }

        // Batch state updates together to minimize re-renders
        setDragOffset({ x: deltaX, y: deltaY });
        setSnapTarget(foundSnap ? newSnapTarget : null);
      });
    },
    [dragState, roomMap]
  );

  // Mouse up handler to finish dragging
  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame
    if (dragAnimationFrame.current !== null) {
      cancelAnimationFrame(dragAnimationFrame.current);
      dragAnimationFrame.current = null;
    }

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
    const hasMoved =
      dragOffset &&
      (Math.abs(dragOffset.x) > MOVEMENT_THRESHOLD || Math.abs(dragOffset.y) > MOVEMENT_THRESHOLD);

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
    const updatedRooms = data.rooms.map(r => (r.id === dragState.roomId ? updatedRoom : r));

    // Clear drag state immediately before updating (fixes green highlight persistence)
    setDragState(null);
    setSnapTarget(null);
    setDragOffset(null);
    setConnectedRooms(new Set());

    // Trigger update after clearing drag state
    onRoomUpdate({ ...data, rooms: updatedRooms });
  }, [dragState, dragOffset, snapTarget, data, onRoomUpdate, roomMap]);

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState, handleMouseUp]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (dragAnimationFrame.current !== null) {
        cancelAnimationFrame(dragAnimationFrame.current);
      }
    };
  }, []);

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
        {Object.values(roomMap)
          .filter(room => !partIds.has(room.id)) // Only render top-level rooms, not parts
          .map(room => (
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
              onDimensionsUpdate={handleRoomDimensionsUpdate}
              onMouseEnter={setHoveredRoomId}
              onMouseLeave={() => setHoveredRoomId(null)}
            />
          ))}

        {/* Doors */}
        {data.doors?.map((door, index) => {
          // Skip freestanding doors (they're rendered separately)
          if (!door.room) return null;

          const roomId = door.room.split(':')[0];
          // Check if the door's room or its parent (if it's a part) is being dragged
          const parentRoomId = partToParent.get(roomId);
          const isDragging = dragState?.roomId === roomId || dragState?.roomId === parentRoomId;
          const transform =
            isDragging && dragOffset
              ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
              : undefined;
          return (
            <g key={`door-${index}`} data-testid={`door-${index}`} transform={transform}>
              <DoorRenderer
                door={door}
                index={index}
                roomMap={roomMap}
                mm={mm}
                onClick={onDoorClick}
                onDragUpdate={onDoorDragUpdate}
              />
            </g>
          );
        })}

        {/* Windows */}
        {data.windows?.map((window, index) => {
          // Skip freestanding windows (they're rendered separately)
          if (!window.room) return null;

          const roomId = window.room.split(':')[0];
          // Check if the window's room or its parent (if it's a part) is being dragged
          const parentRoomId = partToParent.get(roomId);
          const isDragging = dragState?.roomId === roomId || dragState?.roomId === parentRoomId;
          const transform =
            isDragging && dragOffset
              ? `translate(${mm(dragOffset.x)} ${mm(dragOffset.y)})`
              : undefined;
          return (
            <g key={`window-${index}`} data-testid={`window-${index}`} transform={transform}>
              <WindowRenderer
                window={window}
                index={index}
                roomMap={roomMap}
                mm={mm}
                onClick={onWindowClick}
                onDragUpdate={onWindowDragUpdate}
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
          onObjectClick={onObjectClick}
          onObjectDragUpdate={onObjectDragUpdate}
          hoveredObject={hoveredObject}
          onObjectMouseEnter={(roomId, objectIndex, partId) =>
            setHoveredObject({ roomId, objectIndex, partId })
          }
          onObjectMouseLeave={() => setHoveredObject(null)}
          onObjectResizeStart={handleObjectResizeStart}
          onObjectResizeNumeric={handleObjectResizeNumeric}
        />

        {/* Freestanding doors (at absolute coordinates) */}
        {data.doors && data.doors.filter(d => d.x !== undefined).length > 0 && (
          <FreestandingDoorsRenderer
            doors={data.doors.filter(d => d.x !== undefined)}
            roomMap={roomMap}
            mm={mm}
            onDoorClick={onDoorClick}
            onDoorDragUpdate={onFreestandingDoorDragUpdate}
          />
        )}

        {/* Freestanding windows (at absolute coordinates) */}
        {data.windows && data.windows.filter(w => w.x !== undefined).length > 0 && (
          <FreestandingWindowsRenderer
            windows={data.windows.filter(w => w.x !== undefined)}
            roomMap={roomMap}
            mm={mm}
            onWindowClick={onWindowClick}
            onWindowDragUpdate={onFreestandingWindowDragUpdate}
          />
        )}

        {/* Freestanding objects (at absolute coordinates) */}
        {data.objects && data.objects.length > 0 && (
          <FreestandingObjectsRenderer
            objects={data.objects}
            roomMap={roomMap}
            mm={mm}
            onObjectClick={objectIndex => onObjectClick?.('freestanding', objectIndex)}
            onObjectDragUpdate={onFreestandingObjectDragUpdate}
          />
        )}

        {/* Resize handles - rendered on top when hovering */}
        {hoveredRoomId &&
          !dragState &&
          !resizeState &&
          roomMap[hoveredRoomId] &&
          !partIds.has(hoveredRoomId) && (
            <ResizeHandles
              room={roomMap[hoveredRoomId]}
              mm={mm}
              onResizeStart={handleResizeStart}
              onResizeNumeric={handleResizeNumeric}
              onMouseEnter={() => setHoveredRoomId(hoveredRoomId)}
              visible={true}
            />
          )}

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
};

// Memoize the component to prevent unnecessary re-renders
export const FloorplanRenderer = memo(FloorplanRendererComponent);
