import { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import type { FloorplanData, ResolvedRoom, Anchor, WallPosition, SwingDirection } from '../types';
import {
  mm,
  resolveRoomPositions,
  resolveCompositeRoom,
  getCorner,
  getAnchorAdjustment,
} from '../utils';
import { calculateResize } from '../utils/resizeCalculator';
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
import { OffsetArrows, type OffsetDirection } from './floorplan/OffsetArrows';

// Constants
const BOUNDS_PADDING_PERCENTAGE = 0.1; // 10% padding on each side
const DEFAULT_OBJECT_SIZE = 1000; // mm
const CORNER_GRAB_RADIUS = 600; // mm - distance from corner to detect hover/grab
const SNAP_DISTANCE = 500; // mm - distance to snap to another corner

interface FloorplanRendererProps {
  data: FloorplanData;
  onPositioningErrors?: (errors: string[]) => void;
  onRoomClick?: (roomId: string) => void;
  onPartClick?: (roomId: string, partId: string) => void;
  selectedPartId?: string | null;
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
  onDoorSwingUpdate?: (doorIndex: number, newSwing: SwingDirection) => void;
  onDoorResizeUpdate?: (doorIndex: number, newWidth: number, newOffset: number) => void;
  onWindowResizeUpdate?: (windowIndex: number, newWidth: number, newOffset: number) => void;
  onBackgroundClick?: () => void;
}

interface DragState {
  roomId: string;
  dragType: 'corner' | 'center';
  anchor?: Anchor;
  startMouseX: number;
  startMouseY: number;
  startRoomX: number;
  startRoomY: number;
  // Part-specific fields (when dragging a part instead of a room)
  partId?: string;
  parentRoomId?: string;
}

interface CornerHighlight {
  roomId: string;
  corner: Anchor;
  partId?: string; // If set, this is a part corner, not a room corner
}

// Type for tracking which element is currently focused (showing buttons/handles)
type FocusedElement =
  | { type: 'room'; roomId: string }
  | { type: 'part'; roomId: string; partId: string }
  | { type: 'door'; index: number }
  | { type: 'window'; index: number }
  | { type: 'object'; roomId: string; objectIndex: number; partId?: string }
  | { type: 'freestandingObject'; index: number }
  | null;

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
  onPartClick,
  selectedPartId,
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
  onDoorSwingUpdate,
  onDoorResizeUpdate,
  onWindowResizeUpdate,
  onBackgroundClick,
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

  // Part resize state
  const [partResizeState, setPartResizeState] = useState<{
    parentRoomId: string;
    partId: string;
    edge: ResizeEdge;
    startMouseX: number;
    startMouseY: number;
    startWidth: number;
    startDepth: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const partResizeStateRef = useRef(partResizeState);
  // Keep hoveredRoomId for UI hover effects (CSS class changes)
  const [, setHoveredRoomId] = useState<string | null>(null);

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

  // Freestanding object state
  const [hoveredFreestandingObjectIndex, setHoveredFreestandingObjectIndex] = useState<
    number | null
  >(null);

  // Focused element state (for click-to-show-buttons behavior)
  const [focusedElement, setFocusedElement] = useState<FocusedElement>(null);
  const [freestandingObjectResizeState, setFreestandingObjectResizeState] = useState<{
    objectIndex: number;
    corner: Anchor;
    startMouseX: number;
    startMouseY: number;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
  } | null>(null);
  const freestandingObjectResizeStateRef = useRef(freestandingObjectResizeState);

  // Offset drag state
  const [offsetDragState, setOffsetDragState] = useState<{
    roomId: string;
    direction: OffsetDirection;
    startMouseX: number;
    startMouseY: number;
    startOffset: [number, number];
  } | null>(null);
  const offsetDragStateRef = useRef(offsetDragState);

  // Part offset drag state
  const [partOffsetDragState, setPartOffsetDragState] = useState<{
    parentRoomId: string;
    partId: string;
    direction: OffsetDirection;
    startMouseX: number;
    startMouseY: number;
    startOffset: [number, number];
  } | null>(null);
  const partOffsetDragStateRef = useRef(partOffsetDragState);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Use ref to track animation frame for drag updates
  const dragAnimationFrame = useRef<number | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    resizeStateRef.current = resizeState;
  }, [resizeState]);

  useEffect(() => {
    objectResizeStateRef.current = objectResizeState;
  }, [objectResizeState]);

  useEffect(() => {
    freestandingObjectResizeStateRef.current = freestandingObjectResizeState;
  }, [freestandingObjectResizeState]);

  useEffect(() => {
    offsetDragStateRef.current = offsetDragState;
  }, [offsetDragState]);

  useEffect(() => {
    partResizeStateRef.current = partResizeState;
  }, [partResizeState]);

  useEffect(() => {
    partOffsetDragStateRef.current = partOffsetDragState;
  }, [partOffsetDragState]);

  // Memoize room resolution to avoid recalculating on every render
  const { roomMap, errors, partIds, partToParent, normalizationOffset } = useMemo(() => {
    const result = resolveRoomPositions(data.rooms);

    // Calculate the normalization offset by finding the first room's un-normalized position
    // This is needed to correctly position rooms when dragging them to zeropoint
    let normOffset = { x: 0, y: 0 };
    if (data.rooms.length > 0) {
      const firstRoom = data.rooms[0];
      // If the first room has an offset from zeropoint, that's the normalization offset
      if (
        firstRoom.attachTo?.startsWith('zeropoint:') ||
        !firstRoom.attachTo ||
        !data.rooms.some(r => r.id === firstRoom.attachTo?.split(':')[0])
      ) {
        const offset = firstRoom.offset || [0, 0];
        const anchor = firstRoom.anchor || 'top-left';
        // Calculate the anchor adjustment
        const anchorAdj = getAnchorAdjustment(anchor, firstRoom.width, firstRoom.depth);
        normOffset = {
          x: offset[0] + anchorAdj.x,
          y: offset[1] + anchorAdj.y,
        };
      }
    }

    // Add virtual zeropoint "room" for freestanding elements
    result.roomMap['zeropoint'] = {
      id: 'zeropoint',
      x: 0,
      y: 0,
      width: 0,
      depth: 0,
      attachTo: 'zeropoint:top-left',
    };

    return { ...result, normalizationOffset: normOffset };
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

  // Calculate grid bounds to cover beyond the viewBox for seamless appearance
  // Add extra grid steps beyond the viewBox to ensure grid covers the entire visible area
  // When zoomed out, we need more grid coverage
  const baseExtraSteps = 5;
  const zoomExtraSteps = Math.ceil(baseExtraSteps / Math.min(zoom, 1));
  const panExtraX = Math.abs(panOffset.x) / gridStep;
  const panExtraY = Math.abs(panOffset.y) / gridStep;
  const extraGridStepsX = zoomExtraSteps + Math.ceil(panExtraX) + 2;
  const extraGridStepsY = zoomExtraSteps + Math.ceil(panExtraY) + 2;

  const gridMinX = Math.floor(bounds.x / gridStep) * gridStep - gridStep * extraGridStepsX;
  const gridMinY = Math.floor(bounds.y / gridStep) * gridStep - gridStep * extraGridStepsY;
  const gridMaxX =
    Math.ceil((bounds.x + bounds.width) / gridStep) * gridStep + gridStep * extraGridStepsX;
  const gridMaxY =
    Math.ceil((bounds.y + bounds.depth) / gridStep) * gridStep + gridStep * extraGridStepsY;

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
        if (partIds.has(room.id)) continue; // Skip parts in top-level iteration

        if (isPointInRoom(room, x, y)) {
          // First check if we're near a part corner (parts take priority)
          if (room.parts) {
            for (const part of room.parts) {
              const resolvedPart = roomMap[part.id];
              if (!resolvedPart) continue;

              // Check if inside this part
              if (
                x >= resolvedPart.x &&
                x <= resolvedPart.x + resolvedPart.width &&
                y >= resolvedPart.y &&
                y <= resolvedPart.y + resolvedPart.depth
              ) {
                const closest = findClosestCorner(resolvedPart, x, y);
                if (closest) {
                  setHoveredCorner({
                    roomId: room.id,
                    corner: closest.corner,
                    partId: part.id,
                  });
                  foundHover = true;
                  break;
                }
              }
            }
          }

          // If not near a part corner, check room corner
          if (!foundHover) {
            const closest = findClosestCorner(room, x, y);
            if (closest) {
              // Near a corner - highlight ONLY that specific corner
              setHoveredCorner({ roomId: room.id, corner: closest.corner });
              foundHover = true;
            }
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

  // Mouse down handler for part dragging
  const handlePartMouseDown = (
    e: React.MouseEvent<SVGElement>,
    parentRoomId: string,
    partId: string
  ) => {
    e.stopPropagation();
    const { x, y } = screenToMM(e.clientX, e.clientY);

    // Parts are stored in roomMap with their own id
    const part = roomMap[partId];
    if (!part) return;

    // Check if clicking on corner of the part
    const closest = findClosestCorner(part, x, y);
    if (closest) {
      setDragState({
        roomId: partId,
        dragType: 'corner',
        anchor: closest.corner,
        startMouseX: x,
        startMouseY: y,
        startRoomX: part.x,
        startRoomY: part.y,
        partId,
        parentRoomId,
      });
    } else if (isInsideRoomCenter(part, x, y)) {
      setDragState({
        roomId: partId,
        dragType: 'center',
        startMouseX: x,
        startMouseY: y,
        startRoomX: part.x,
        startRoomY: part.y,
        partId,
        parentRoomId,
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

      // Use unified resize calculation for all object types
      const resizeResult = calculateResize({
        corner: currentObjectResizeState.corner,
        deltaX,
        deltaY,
        startWidth: currentObjectResizeState.startWidth,
        startHeight: currentObjectResizeState.startHeight,
        startX: currentObjectResizeState.startX,
        startY: currentObjectResizeState.startY,
        objectType: obj.type,
        anchor: obj.anchor || 'top-left',
      });

      const newWidth = resizeResult.width;
      const newHeight = resizeResult.height;
      const newX = resizeResult.x;
      const newY = resizeResult.y;

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
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight,
              };
              updatedPart.objects = updatedObjects;
              updatedParts[partIdx] = updatedPart;
              updatedRoom.parts = updatedParts;
            }
          } else if (updatedRoom.objects) {
            const updatedObjects = [...updatedRoom.objects];
            updatedObjects[currentObjectResizeState.objectIndex] = {
              ...updatedObjects[currentObjectResizeState.objectIndex],
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight,
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
      _corner: Anchor,
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

  // Freestanding object resize handlers
  const handleFreestandingObjectResizeEnd = useCallback(() => {
    setFreestandingObjectResizeState(null);
  }, []);

  const handleFreestandingObjectResizeMove = useCallback(
    (x: number, y: number) => {
      const currentState = freestandingObjectResizeStateRef.current;
      if (!currentState) return;

      // Initialize start position on first move
      if (currentState.startMouseX === 0 && currentState.startMouseY === 0) {
        setFreestandingObjectResizeState({
          ...currentState,
          startMouseX: x,
          startMouseY: y,
        });
        return;
      }

      // Calculate delta from start position
      const deltaX = x - currentState.startMouseX;
      const deltaY = y - currentState.startMouseY;

      // Find the object
      if (!data.objects || !data.objects[currentState.objectIndex]) return;

      const obj = data.objects[currentState.objectIndex];

      // Use unified resize calculation for all object types
      const resizeResult = calculateResize({
        corner: currentState.corner,
        deltaX,
        deltaY,
        startWidth: currentState.startWidth,
        startHeight: currentState.startHeight,
        startX: currentState.startX,
        startY: currentState.startY,
        objectType: obj.type,
        anchor: obj.anchor || 'top-left',
      });

      // Update the object
      if (onRoomUpdate) {
        const updatedObjects = [...(data.objects || [])];
        updatedObjects[currentState.objectIndex] = {
          ...updatedObjects[currentState.objectIndex],
          x: resizeResult.x,
          y: resizeResult.y,
          width: resizeResult.width,
          height: resizeResult.height,
        };
        onRoomUpdate({ ...data, objects: updatedObjects });
      }
    },
    [data, onRoomUpdate]
  );

  const handleFreestandingObjectResizeStart = useCallback(
    (objectIndex: number, corner: Anchor) => {
      if (!data.objects || !data.objects[objectIndex]) return;

      const obj = data.objects[objectIndex];
      const objWidth = obj.width || DEFAULT_OBJECT_SIZE;
      const objHeight = obj.type === 'circle' ? objWidth : obj.height || objWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const { x, y } = screenToMM(e.clientX, e.clientY);
        handleFreestandingObjectResizeMove(x, y);
      };

      const handleMouseUp = () => {
        handleFreestandingObjectResizeEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      setFreestandingObjectResizeState({
        objectIndex,
        corner,
        startMouseX: 0,
        startMouseY: 0,
        startWidth: objWidth,
        startHeight: objHeight,
        startX: obj.x,
        startY: obj.y,
      });
    },
    [
      data.objects,
      handleFreestandingObjectResizeMove,
      handleFreestandingObjectResizeEnd,
      screenToMM,
    ]
  );

  const handleFreestandingObjectResizeNumeric = useCallback(
    (objectIndex: number, _corner: Anchor, currentWidth: number, currentHeight?: number) => {
      if (!onRoomUpdate) return;

      if (!data.objects || !data.objects[objectIndex]) return;

      const obj = data.objects[objectIndex];
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

        const updatedObjects = [...data.objects];
        updatedObjects[objectIndex] = {
          ...updatedObjects[objectIndex],
          width: newDiameter,
        };
        onRoomUpdate({ ...data, objects: updatedObjects });
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

        const updatedObjects = [...data.objects];
        updatedObjects[objectIndex] = {
          ...updatedObjects[objectIndex],
          width: newWidth,
          height: newHeight,
        };
        onRoomUpdate({ ...data, objects: updatedObjects });
      }
    },
    [data, onRoomUpdate]
  );

  // Offset drag handlers
  const handleOffsetDragEnd = useCallback(() => {
    setOffsetDragState(null);
  }, []);

  const handleOffsetDragMove = useCallback(
    (x: number, y: number) => {
      const currentOffsetDragState = offsetDragStateRef.current;
      if (!currentOffsetDragState) return;
      if (!onRoomUpdate) return;

      const room = data.rooms.find(r => r.id === currentOffsetDragState.roomId);
      if (!room) return;

      // Initialize start position on first move
      if (currentOffsetDragState.startMouseX === 0 && currentOffsetDragState.startMouseY === 0) {
        setOffsetDragState({
          ...currentOffsetDragState,
          startMouseX: x,
          startMouseY: y,
        });
        return;
      }

      // Calculate delta from start position
      const deltaX = x - currentOffsetDragState.startMouseX;
      const deltaY = y - currentOffsetDragState.startMouseY;

      // Determine which axis to adjust based on direction
      let newOffsetX = currentOffsetDragState.startOffset[0];
      let newOffsetY = currentOffsetDragState.startOffset[1];

      switch (currentOffsetDragState.direction) {
        case 'left':
        case 'right':
          // Horizontal arrows adjust X offset
          newOffsetX = Math.round(currentOffsetDragState.startOffset[0] + deltaX);
          break;
        case 'top':
        case 'bottom':
          // Vertical arrows adjust Y offset
          newOffsetY = Math.round(currentOffsetDragState.startOffset[1] + deltaY);
          break;
      }

      // Update the room offset
      const updatedRoom = { ...room, offset: [newOffsetX, newOffsetY] as [number, number] };
      const updatedRooms = data.rooms.map(r =>
        r.id === currentOffsetDragState.roomId ? updatedRoom : r
      );
      onRoomUpdate({ ...data, rooms: updatedRooms });
    },
    [data, onRoomUpdate]
  );

  const handleOffsetDragStart = useCallback(
    (roomId: string, direction: OffsetDirection) => {
      const room = data.rooms.find(r => r.id === roomId);
      if (!room) return;

      const handleMouseMove = (e: MouseEvent) => {
        const { x, y } = screenToMM(e.clientX, e.clientY);
        handleOffsetDragMove(x, y);
      };

      const handleMouseUp = () => {
        handleOffsetDragEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Set initial offset drag state
      const currentOffset = room.offset || [0, 0];
      setOffsetDragState({
        roomId,
        direction,
        startMouseX: 0, // Will be set on first move
        startMouseY: 0, // Will be set on first move
        startOffset: [currentOffset[0], currentOffset[1]],
      });
    },
    [data, handleOffsetDragMove, handleOffsetDragEnd]
  );

  // Part resize handlers
  const handlePartResizeEnd = useCallback(() => {
    setPartResizeState(null);
  }, []);

  const handlePartResizeMove = useCallback(
    (x: number, y: number) => {
      const currentPartResizeState = partResizeStateRef.current;
      if (!currentPartResizeState) return;

      const part = roomMap[currentPartResizeState.partId];
      if (!part) return;

      // Initialize start position on first move
      if (currentPartResizeState.startMouseX === 0 && currentPartResizeState.startMouseY === 0) {
        setPartResizeState({
          ...currentPartResizeState,
          startMouseX: x,
          startMouseY: y,
        });
        return;
      }

      // Calculate delta from start position
      const deltaX = x - currentPartResizeState.startMouseX;
      const deltaY = y - currentPartResizeState.startMouseY;

      // Calculate new dimensions based on which edge is being dragged
      const MIN_SIZE = 500; // mm - minimum part dimension

      let newWidth = currentPartResizeState.startWidth;
      let newDepth = currentPartResizeState.startDepth;
      let newOffsetX = 0;
      let newOffsetY = 0;

      switch (currentPartResizeState.edge) {
        case 'right':
          newWidth = Math.round(Math.max(MIN_SIZE, currentPartResizeState.startWidth + deltaX));
          break;
        case 'left':
          newWidth = Math.round(Math.max(MIN_SIZE, currentPartResizeState.startWidth - deltaX));
          newOffsetX = currentPartResizeState.startWidth - newWidth;
          break;
        case 'bottom':
          newDepth = Math.round(Math.max(MIN_SIZE, currentPartResizeState.startDepth + deltaY));
          break;
        case 'top':
          newDepth = Math.round(Math.max(MIN_SIZE, currentPartResizeState.startDepth - deltaY));
          newOffsetY = currentPartResizeState.startDepth - newDepth;
          break;
      }

      // Get the resolved part
      const resolvedPart = roomMap[currentPartResizeState.partId];
      if (!resolvedPart) return;

      // Get the part data to find what it's attached to
      const parentRoomData = data.rooms.find(r => r.id === currentPartResizeState.parentRoomId);
      const partData = parentRoomData?.parts?.find(p => p.id === currentPartResizeState.partId);

      // Determine what the part is attached to (could be main room or another part)
      const attachToTarget = partData?.attachTo?.split(':')[0];
      const resolvedAttachTarget = attachToTarget ? roomMap[attachToTarget] : null;

      // If we can't find the attach target, use the parent room as fallback
      const resolvedParentRoom = roomMap[currentPartResizeState.parentRoomId];
      const targetForValidation = resolvedAttachTarget || resolvedParentRoom;
      if (!targetForValidation) return;

      // Calculate where the part would be after resize
      const newPartX = resolvedPart.x + newOffsetX;
      const newPartY = resolvedPart.y + newOffsetY;

      // Check if the part would still touch or overlap with its attach target
      const partRight = newPartX + newWidth;
      const partBottom = newPartY + newDepth;
      const targetRight = targetForValidation.x + targetForValidation.width;
      const targetBottom = targetForValidation.y + targetForValidation.depth;

      const wouldTouch =
        newPartX <= targetRight &&
        partRight >= targetForValidation.x &&
        newPartY <= targetBottom &&
        partBottom >= targetForValidation.y;

      // Part must be COMPLETELY OUTSIDE its attach target (only touching at boundary)
      const completelyToRight = newPartX >= targetRight;
      const completelyToLeft = partRight <= targetForValidation.x;
      const completelyBelow = newPartY >= targetBottom;
      const completelyAbove = partBottom <= targetForValidation.y;

      const outsideTarget =
        completelyToRight || completelyToLeft || completelyBelow || completelyAbove;

      // If the part would disconnect or overlap with target interior, don't update
      if (!wouldTouch || !outsideTarget) {
        return;
      }

      // Update the part in data to show live resize feedback
      if (onRoomUpdate) {
        const parentRoom = data.rooms.find(r => r.id === currentPartResizeState.parentRoomId);
        if (parentRoom && parentRoom.parts) {
          const partIndex = parentRoom.parts.findIndex(p => p.id === currentPartResizeState.partId);
          if (partIndex >= 0) {
            const partDataFromRooms = parentRoom.parts[partIndex];
            const updatedPart = { ...partDataFromRooms };
            updatedPart.width = newWidth;
            updatedPart.depth = newDepth;

            // If left or top edge, also adjust offset from the stored start offset
            if (currentPartResizeState.edge === 'left' || currentPartResizeState.edge === 'top') {
              updatedPart.offset = [
                currentPartResizeState.startOffsetX + newOffsetX,
                currentPartResizeState.startOffsetY + newOffsetY,
              ];
            }

            const updatedParts = [...parentRoom.parts];
            updatedParts[partIndex] = updatedPart;
            const updatedParentRoom = { ...parentRoom, parts: updatedParts };
            const updatedRooms = data.rooms.map(r =>
              r.id === currentPartResizeState.parentRoomId ? updatedParentRoom : r
            );
            onRoomUpdate({ ...data, rooms: updatedRooms });
          }
        }
      }
    },
    [roomMap, data, onRoomUpdate]
  );

  const handlePartResizeStart = useCallback(
    (parentRoomId: string, partId: string, edge: ResizeEdge) => {
      const part = roomMap[partId];
      if (!part) return;

      // Get the original offset from the part data
      const parentRoom = data.rooms.find(r => r.id === parentRoomId);
      const partData = parentRoom?.parts?.find(p => p.id === partId);
      const originalOffset = partData?.offset || [0, 0];

      const handleMouseMove = (e: MouseEvent) => {
        const { x, y } = screenToMM(e.clientX, e.clientY);
        handlePartResizeMove(x, y);
      };

      const handleMouseUp = () => {
        handlePartResizeEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Set initial resize state
      setPartResizeState({
        parentRoomId,
        partId,
        edge,
        startMouseX: 0, // Will be set on first move
        startMouseY: 0, // Will be set on first move
        startWidth: part.width,
        startDepth: part.depth,
        startX: part.x,
        startY: part.y,
        startOffsetX: originalOffset[0],
        startOffsetY: originalOffset[1],
      });
    },
    [data.rooms, roomMap, handlePartResizeMove, handlePartResizeEnd]
  );

  // Part offset drag handlers
  const handlePartOffsetDragEnd = useCallback(() => {
    setPartOffsetDragState(null);
  }, []);

  const handlePartOffsetDragMove = useCallback(
    (x: number, y: number) => {
      const currentPartOffsetDragState = partOffsetDragStateRef.current;
      if (!currentPartOffsetDragState) return;
      if (!onRoomUpdate) return;

      const parentRoom = data.rooms.find(r => r.id === currentPartOffsetDragState.parentRoomId);
      if (!parentRoom || !parentRoom.parts) return;

      const partIndex = parentRoom.parts.findIndex(p => p.id === currentPartOffsetDragState.partId);
      if (partIndex < 0) return;

      const partData = parentRoom.parts[partIndex];

      // Initialize start position on first move
      if (
        currentPartOffsetDragState.startMouseX === 0 &&
        currentPartOffsetDragState.startMouseY === 0
      ) {
        setPartOffsetDragState({
          ...currentPartOffsetDragState,
          startMouseX: x,
          startMouseY: y,
        });
        return;
      }

      // Calculate delta from start position
      const deltaX = x - currentPartOffsetDragState.startMouseX;
      const deltaY = y - currentPartOffsetDragState.startMouseY;

      // Determine which axis to adjust based on direction
      let newOffsetX = currentPartOffsetDragState.startOffset[0];
      let newOffsetY = currentPartOffsetDragState.startOffset[1];

      switch (currentPartOffsetDragState.direction) {
        case 'left':
        case 'right':
          // Horizontal arrows adjust X offset
          newOffsetX = Math.round(currentPartOffsetDragState.startOffset[0] + deltaX);
          break;
        case 'top':
        case 'bottom':
          // Vertical arrows adjust Y offset
          newOffsetY = Math.round(currentPartOffsetDragState.startOffset[1] + deltaY);
          break;
      }

      // Get the resolved part
      const resolvedPart = roomMap[currentPartOffsetDragState.partId];
      if (!resolvedPart) return;

      // Determine what the part is attached to (could be main room or another part)
      // Parse attachTo to get the target ID (format: "targetId:corner")
      const attachToTarget = partData.attachTo?.split(':')[0];
      const resolvedAttachTarget = attachToTarget ? roomMap[attachToTarget] : null;

      // If we can't find the attach target, use the parent room as fallback
      const resolvedParentRoom = roomMap[currentPartOffsetDragState.parentRoomId];
      const targetForValidation = resolvedAttachTarget || resolvedParentRoom;
      if (!targetForValidation) return;

      // Calculate where the part would be with the new offset
      const currentOffset = partData.offset || [0, 0];
      const offsetDeltaX = newOffsetX - currentOffset[0];
      const offsetDeltaY = newOffsetY - currentOffset[1];
      const newPartX = resolvedPart.x + offsetDeltaX;
      const newPartY = resolvedPart.y + offsetDeltaY;

      // Check if the part would still touch or overlap with its attach target
      const partRight = newPartX + resolvedPart.width;
      const partBottom = newPartY + resolvedPart.depth;
      const targetRight = targetForValidation.x + targetForValidation.width;
      const targetBottom = targetForValidation.y + targetForValidation.depth;

      // Check if rectangles would still touch (allowing edge contact)
      const wouldTouch =
        newPartX <= targetRight &&
        partRight >= targetForValidation.x &&
        newPartY <= targetBottom &&
        partBottom >= targetForValidation.y;

      // Part must be COMPLETELY OUTSIDE its attach target (only touching at boundary)
      const completelyToRight = newPartX >= targetRight;
      const completelyToLeft = partRight <= targetForValidation.x;
      const completelyBelow = newPartY >= targetBottom;
      const completelyAbove = partBottom <= targetForValidation.y;

      const outsideTarget =
        completelyToRight || completelyToLeft || completelyBelow || completelyAbove;

      // If the part would disconnect or overlap with target interior, don't update
      if (!wouldTouch || !outsideTarget) {
        return;
      }

      // Update the part offset
      const updatedPart = { ...partData, offset: [newOffsetX, newOffsetY] as [number, number] };
      const updatedParts = [...parentRoom.parts];
      updatedParts[partIndex] = updatedPart;
      const updatedParentRoom = { ...parentRoom, parts: updatedParts };
      const updatedRooms = data.rooms.map(r =>
        r.id === currentPartOffsetDragState.parentRoomId ? updatedParentRoom : r
      );
      onRoomUpdate({ ...data, rooms: updatedRooms });
    },
    [data, onRoomUpdate, roomMap]
  );

  const handlePartOffsetDragStart = useCallback(
    (parentRoomId: string, partId: string, direction: OffsetDirection) => {
      const parentRoom = data.rooms.find(r => r.id === parentRoomId);
      if (!parentRoom || !parentRoom.parts) return;

      const part = parentRoom.parts.find(p => p.id === partId);
      if (!part) return;

      const handleMouseMove = (e: MouseEvent) => {
        const { x, y } = screenToMM(e.clientX, e.clientY);
        handlePartOffsetDragMove(x, y);
      };

      const handleMouseUp = () => {
        handlePartOffsetDragEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Set initial offset drag state
      const currentOffset = part.offset || [0, 0];
      setPartOffsetDragState({
        parentRoomId,
        partId,
        direction,
        startMouseX: 0, // Will be set on first move
        startMouseY: 0, // Will be set on first move
        startOffset: [currentOffset[0], currentOffset[1]],
      });
    },
    [data, handlePartOffsetDragMove, handlePartOffsetDragEnd]
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
          // For parts, only check parent room and sibling parts
          if (dragState.partId && dragState.parentRoomId) {
            const parentRoom = roomMap[dragState.parentRoomId];
            if (parentRoom) {
              // Check parent room corners
              const otherCorners: Anchor[] = [
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
              ];
              for (const otherCorner of otherCorners) {
                const otherPos = getCorner(parentRoom, otherCorner);
                const dist = Math.sqrt(Math.pow(x - otherPos.x, 2) + Math.pow(y - otherPos.y, 2));

                if (dist < SNAP_DISTANCE) {
                  newSnapTarget = { roomId: parentRoom.id, corner: otherCorner };
                  foundSnap = true;
                  break;
                }
              }

              // Check sibling part corners
              if (!foundSnap && parentRoom.parts) {
                for (const siblingPart of parentRoom.parts) {
                  if (siblingPart.id === dragState.partId) continue;
                  const siblingResolved = roomMap[siblingPart.id];
                  if (!siblingResolved) continue;

                  for (const otherCorner of otherCorners) {
                    const otherPos = getCorner(siblingResolved, otherCorner);
                    const dist = Math.sqrt(
                      Math.pow(x - otherPos.x, 2) + Math.pow(y - otherPos.y, 2)
                    );

                    if (dist < SNAP_DISTANCE) {
                      newSnapTarget = {
                        roomId: siblingResolved.id,
                        corner: otherCorner,
                        partId: siblingPart.id,
                      };
                      foundSnap = true;
                      break;
                    }
                  }
                  if (foundSnap) break;
                }
              }
            }
          } else {
            // For rooms, check all other rooms for snap targets
            for (const otherRoom of Object.values(roomMap)) {
              if (otherRoom.id === dragState.roomId) continue;

              const otherCorners: Anchor[] = [
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
              ];
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

    // Check if the element actually moved significantly (more than 100mm)
    const MOVEMENT_THRESHOLD = 100; // mm
    const hasMoved =
      dragOffset &&
      (Math.abs(dragOffset.x) > MOVEMENT_THRESHOLD || Math.abs(dragOffset.y) > MOVEMENT_THRESHOLD);

    // Handle part dragging
    if (dragState.partId && dragState.parentRoomId) {
      const parentRoom = data.rooms.find(r => r.id === dragState.parentRoomId);
      if (!parentRoom || !parentRoom.parts) {
        setDragState(null);
        setSnapTarget(null);
        setDragOffset(null);
        return;
      }

      const partIndex = parentRoom.parts.findIndex(p => p.id === dragState.partId);
      if (partIndex === -1) {
        setDragState(null);
        setSnapTarget(null);
        setDragOffset(null);
        return;
      }

      const part = parentRoom.parts[partIndex];
      const resolvedPart = roomMap[dragState.partId!];

      if (!resolvedPart || !dragOffset) {
        setDragState(null);
        setSnapTarget(null);
        setDragOffset(null);
        return;
      }

      // Parts MUST snap to parent room or sibling part corners - no free-standing positioning
      // If no snap target, cancel the drag
      if (!snapTarget || !hasMoved) {
        setDragState(null);
        setSnapTarget(null);
        setDragOffset(null);
        return;
      }

      // Calculate where the part would be after snapping
      const resolvedParentRoom = roomMap[dragState.parentRoomId];
      if (!resolvedParentRoom) {
        setDragState(null);
        setSnapTarget(null);
        setDragOffset(null);
        return;
      }

      // Get the target position (where the part's anchor will snap to)
      const targetRoom = roomMap[snapTarget.roomId];
      if (!targetRoom) {
        setDragState(null);
        setSnapTarget(null);
        setDragOffset(null);
        return;
      }
      const targetCornerPos = getCorner(targetRoom, snapTarget.corner);

      // Calculate where the part would be positioned based on its anchor
      const partAnchor = dragState.anchor || 'top-left';
      let newPartX = targetCornerPos.x;
      let newPartY = targetCornerPos.y;

      // Adjust position based on which corner of the part is being anchored
      if (partAnchor === 'top-right' || partAnchor === 'bottom-right') {
        newPartX -= resolvedPart.width;
      }
      if (partAnchor === 'bottom-left' || partAnchor === 'bottom-right') {
        newPartY -= resolvedPart.depth;
      }

      // Check if the part would extend beyond at least one edge of the parent room
      const partRight = newPartX + resolvedPart.width;
      const partBottom = newPartY + resolvedPart.depth;
      const parentRight = resolvedParentRoom.x + resolvedParentRoom.width;
      const parentBottom = resolvedParentRoom.y + resolvedParentRoom.depth;

      const extendsRoom =
        newPartX < resolvedParentRoom.x ||
        partRight > parentRight ||
        newPartY < resolvedParentRoom.y ||
        partBottom > parentBottom;

      // If the part would be completely inside the parent, reject the snap
      if (!extendsRoom) {
        setDragState(null);
        setSnapTarget(null);
        setDragOffset(null);
        return;
      }

      // Snap to target (parent room corner or sibling part corner)
      const updatedPart = { ...part };
      updatedPart.attachTo = `${snapTarget.roomId}:${snapTarget.corner}`;
      updatedPart.anchor = dragState.anchor || 'top-left';
      delete updatedPart.offset;

      // Update the part in the parent room
      const updatedParts = [...parentRoom.parts];
      updatedParts[partIndex] = updatedPart;
      const updatedParentRoom = { ...parentRoom, parts: updatedParts };
      const updatedRooms = data.rooms.map(r =>
        r.id === dragState.parentRoomId ? updatedParentRoom : r
      );

      // Clear drag state immediately before updating
      setDragState(null);
      setSnapTarget(null);
      setDragOffset(null);
      setConnectedRooms(new Set());

      // Trigger update after clearing drag state
      onRoomUpdate({ ...data, rooms: updatedRooms });
      return;
    }

    // Handle room dragging (existing logic)
    const room = data.rooms.find(r => r.id === dragState.roomId);
    if (!room) {
      setDragState(null);
      setSnapTarget(null);
      setDragOffset(null);
      return;
    }

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
        // Add normalization offset to get the correct absolute position
        const newCornerX = cornerPos.x + dragOffset.x + normalizationOffset.x;
        const newCornerY = cornerPos.y + dragOffset.y + normalizationOffset.y;
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
          // Add normalization offset to get the correct absolute position
          const newCornerX = cornerPos.x + dragOffset.x + normalizationOffset.x;
          const newCornerY = cornerPos.y + dragOffset.y + normalizationOffset.y;
          updatedRoom.offset = [newCornerX, newCornerY];
        } else {
          // Attached to another room - convert to zeropoint with current position
          const cornerPos = getCorner(resolvedRoom, dragState.anchor);
          // Add normalization offset to get the correct absolute position
          const newCornerX = cornerPos.x + dragOffset.x + normalizationOffset.x;
          const newCornerY = cornerPos.y + dragOffset.y + normalizationOffset.y;
          updatedRoom.attachTo = 'zeropoint:top-left';
          updatedRoom.anchor = dragState.anchor;
          updatedRoom.offset = [newCornerX, newCornerY];
        }
      }
    } else if (dragState.dragType === 'center' && hasMoved) {
      // Center drag with significant movement - attach to zeropoint with offset
      if (resolvedRoom && dragOffset) {
        // Add normalization offset to get the correct absolute position
        const newX = resolvedRoom.x + dragOffset.x + normalizationOffset.x;
        const newY = resolvedRoom.y + dragOffset.y + normalizationOffset.y;
        updatedRoom.attachTo = 'zeropoint:top-left';
        updatedRoom.anchor = 'top-left';
        updatedRoom.offset = [newX, newY];
      }
    } else if (dragState.dragType === 'center' && !hasMoved) {
      // Tiny center movement - adjust offset but keep existing attachment
      if (resolvedRoom && dragOffset) {
        if (room.attachTo?.startsWith('zeropoint:')) {
          // Already at zeropoint, adjust offset
          // Add normalization offset to get the correct absolute position
          const newX = resolvedRoom.x + dragOffset.x + normalizationOffset.x;
          const newY = resolvedRoom.y + dragOffset.y + normalizationOffset.y;
          updatedRoom.offset = [newX, newY];
        } else {
          // Attached to another room - convert to zeropoint
          // Add normalization offset to get the correct absolute position
          const newX = resolvedRoom.x + dragOffset.x + normalizationOffset.x;
          const newY = resolvedRoom.y + dragOffset.y + normalizationOffset.y;
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
  }, [dragState, dragOffset, snapTarget, data, onRoomUpdate, roomMap, normalizationOffset]);

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

  // ESC key handler to clear focused element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusedElement(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handler for clicking on SVG background (empty space) to clear focus
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Only clear focus if clicking directly on SVG (not on a child element)
      if (e.target === e.currentTarget) {
        setFocusedElement(null);
        onBackgroundClick?.();
      }
    },
    [onBackgroundClick]
  );

  // Handlers for setting focus on different element types
  const handleDoorFocus = useCallback((index: number) => {
    setFocusedElement({ type: 'door', index });
  }, []);

  const handleWindowFocus = useCallback((index: number) => {
    setFocusedElement({ type: 'window', index });
  }, []);

  const handleRoomFocus = useCallback((roomId: string) => {
    setFocusedElement({ type: 'room', roomId });
  }, []);

  const handlePartFocus = useCallback((roomId: string, partId: string) => {
    setFocusedElement({ type: 'part', roomId, partId });
  }, []);

  const handleObjectFocus = useCallback((roomId: string, objectIndex: number, partId?: string) => {
    setFocusedElement({ type: 'object', roomId, objectIndex, partId });
  }, []);

  const handleFreestandingObjectFocus = useCallback((index: number) => {
    setFocusedElement({ type: 'freestandingObject', index });
  }, []);

  // Calculate zoomed viewBox
  // When zoom > 1, we want a smaller viewBox (see less, zoomed in)
  // When zoom < 1, we want a larger viewBox (see more, zoomed out)
  const zoomedViewBox = useMemo(() => {
    const baseWidth = mm(bounds.width);
    const baseDepth = mm(bounds.depth);
    const baseX = mm(bounds.x);
    const baseY = mm(bounds.y);

    // Calculate the center of the original viewBox
    const centerX = baseX + baseWidth / 2;
    const centerY = baseY + baseDepth / 2;

    // Zoom scales the view: zoom > 1 means see less (zoomed in)
    const zoomedWidth = baseWidth / zoom;
    const zoomedDepth = baseDepth / zoom;

    // Calculate new origin to keep center stable, then apply pan offset
    const newX = centerX - zoomedWidth / 2 - panOffset.x;
    const newY = centerY - zoomedDepth / 2 - panOffset.y;

    return `${newX} ${newY} ${zoomedWidth} ${zoomedDepth}`;
  }, [bounds, zoom, panOffset]);

  // Handle mouse wheel for zooming (with Ctrl) or panning (without Ctrl)
  // Touchpad pinch-to-zoom sends wheel events with ctrlKey: true
  // Touchpad two-finger scroll sends regular wheel events
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Only prevent default for pinch-to-zoom (ctrlKey), not for regular Ctrl++ page zoom
      // This allows Ctrl++ keyboard shortcut to still zoom the page
      if (!svgRef.current) return;

      // Pinch-to-zoom (touchpad) or Ctrl+wheel (mouse) -> zoom SVG
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        // Touchpad pinch uses smaller delta values, so use a gentler zoom factor
        const zoomFactor = 1.02;
        const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
        const newZoom = Math.min(Math.max(zoom * delta, 0.1), 10);

        // Get mouse position in SVG coordinates before zoom
        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

        // Calculate the center of current viewBox
        const baseWidth = mm(bounds.width);
        const baseDepth = mm(bounds.depth);
        const baseX = mm(bounds.x);
        const baseY = mm(bounds.y);
        const centerX = baseX + baseWidth / 2;
        const centerY = baseY + baseDepth / 2;

        // Current viewBox dimensions
        const currentWidth = baseWidth / zoom;
        const currentDepth = baseDepth / zoom;
        const currentX = centerX - currentWidth / 2 - panOffset.x;
        const currentY = centerY - currentDepth / 2 - panOffset.y;

        // Calculate mouse position as a ratio within the current viewBox
        const ratioX = (svgPt.x - currentX) / currentWidth;
        const ratioY = (svgPt.y - currentY) / currentDepth;

        // New viewBox dimensions after zoom
        const newWidth = baseWidth / newZoom;
        const newDepth = baseDepth / newZoom;

        // Calculate new offset so mouse position stays at same ratio
        const newCenterX = svgPt.x - (ratioX - 0.5) * newWidth;
        const newCenterY = svgPt.y - (ratioY - 0.5) * newDepth;

        const newPanX = centerX - newCenterX;
        const newPanY = centerY - newCenterY;

        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
      } else {
        // Regular scroll (touchpad two-finger or mouse wheel without Ctrl) -> pan
        e.preventDefault();

        const svg = svgRef.current;
        const viewBox = svg.viewBox.baseVal;
        const rect = svg.getBoundingClientRect();

        // Calculate scale from screen pixels to viewBox units
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;

        // Convert scroll delta to pan offset (invert for natural scrolling feel)
        const dx = e.deltaX * scaleX;
        const dy = e.deltaY * scaleY;

        setPanOffset(prev => ({
          x: prev.x - dx,
          y: prev.y - dy,
        }));
      }
    },
    [zoom, panOffset, bounds]
  );

  // Attach wheel listener with passive: false to allow preventDefault
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Handle pan start (middle mouse button or space+left click)
  const handlePanStart = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [isSpacePressed]
  );

  // Handle pan move
  const handlePanMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isPanning || !svgRef.current) return;

      const svg = svgRef.current;
      const viewBox = svg.viewBox.baseVal;

      // Calculate scale from SVG viewBox to screen pixels
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;

      // Convert screen movement to viewBox movement
      const dx = (e.clientX - panStart.x) * scaleX;
      const dy = (e.clientY - panStart.y) * scaleY;

      setPanOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    },
    [isPanning, panStart]
  );

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Reset zoom and pan
  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Space key handler for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Combined mouse move handler
  const handleCombinedMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPanning) {
        handlePanMove(e);
      } else {
        handleMouseMove(e);
      }
    },
    [isPanning, handlePanMove, handleMouseMove]
  );

  // Combined mouse up handler
  const handleCombinedMouseUp = useCallback(() => {
    if (isPanning) {
      handlePanEnd();
    } else {
      handleMouseUp();
    }
  }, [isPanning, handlePanEnd, handleMouseUp]);

  return (
    <div className="preview-container">
      <svg
        ref={svgRef}
        className="floorplan-svg"
        viewBox={zoomedViewBox}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleCombinedMouseMove}
        onMouseDown={handlePanStart}
        onMouseUp={handleCombinedMouseUp}
        onMouseLeave={handlePanEnd}
        onClick={handleSvgClick}
        style={{ cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : undefined }}
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
          .filter(room => room.id !== 'zeropoint') // Exclude virtual zeropoint
          .filter(room => !partIds.has(room.id)) // Only render top-level rooms, not parts
          .map(room => (
            <RoomRenderer
              key={room.id}
              room={room}
              dragState={dragState}
              dragOffset={dragOffset}
              hoveredCorner={hoveredCorner}
              isConnected={connectedRooms.has(room.id)}
              selectedPartId={selectedPartId}
              mm={mm}
              resolveCompositeRoom={resolveCompositeRoom}
              getCorner={getCorner}
              onMouseDown={handleMouseDown}
              onPartMouseDown={handlePartMouseDown}
              onClick={onRoomClick}
              onPartClick={onPartClick}
              onNameUpdate={onRoomNameUpdate}
              onDimensionsUpdate={handleRoomDimensionsUpdate}
              onMouseEnter={setHoveredRoomId}
              onMouseLeave={() => setHoveredRoomId(null)}
              onFocus={handleRoomFocus}
              onPartFocus={handlePartFocus}
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
                onSwingUpdate={onDoorSwingUpdate}
                onResizeUpdate={onDoorResizeUpdate}
                isFocused={focusedElement?.type === 'door' && focusedElement.index === index}
                onFocus={handleDoorFocus}
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
                onResizeUpdate={onWindowResizeUpdate}
                isFocused={focusedElement?.type === 'window' && focusedElement.index === index}
                onFocus={handleWindowFocus}
              />
            </g>
          );
        })}

        {/* All room objects - rendered last so they appear on top */}
        <RoomObjectsRenderer
          roomMap={roomMap}
          partIds={partIds}
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
          focusedObject={
            focusedElement?.type === 'object'
              ? {
                  roomId: focusedElement.roomId,
                  objectIndex: focusedElement.objectIndex,
                  partId: focusedElement.partId,
                }
              : null
          }
          onObjectFocus={handleObjectFocus}
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
            hoveredObjectIndex={hoveredFreestandingObjectIndex}
            onObjectMouseEnter={setHoveredFreestandingObjectIndex}
            onObjectMouseLeave={() => setHoveredFreestandingObjectIndex(null)}
            onObjectResizeStart={handleFreestandingObjectResizeStart}
            onObjectResizeNumeric={handleFreestandingObjectResizeNumeric}
            focusedObjectIndex={
              focusedElement?.type === 'freestandingObject' ? focusedElement.index : null
            }
            onObjectFocus={handleFreestandingObjectFocus}
          />
        )}

        {/* Resize handles - rendered on top when room is focused */}
        {focusedElement?.type === 'room' &&
          !dragState &&
          !resizeState &&
          roomMap[focusedElement.roomId] &&
          !partIds.has(focusedElement.roomId) && (
            <ResizeHandles
              room={roomMap[focusedElement.roomId]}
              mm={mm}
              onResizeStart={handleResizeStart}
              onResizeNumeric={handleResizeNumeric}
              onMouseEnter={() => setHoveredRoomId(focusedElement.roomId)}
              visible={true}
            />
          )}

        {/* Offset arrows - rendered on top when room is focused */}
        {focusedElement?.type === 'room' &&
          !dragState &&
          !resizeState &&
          !offsetDragState &&
          roomMap[focusedElement.roomId] &&
          !partIds.has(focusedElement.roomId) &&
          (() => {
            const originalRoom = data.rooms.find(r => r.id === focusedElement.roomId);
            return originalRoom ? (
              <OffsetArrows
                room={roomMap[focusedElement.roomId]}
                originalRoom={originalRoom}
                mm={mm}
                onOffsetDragStart={handleOffsetDragStart}
                onMouseEnter={() => setHoveredRoomId(focusedElement.roomId)}
                visible={true}
              />
            ) : null;
          })()}

        {/* Resize handles - rendered on top when part is focused */}
        {focusedElement?.type === 'part' &&
          !dragState &&
          !resizeState &&
          !partResizeState &&
          roomMap[focusedElement.partId] && (
            <ResizeHandles
              room={roomMap[focusedElement.partId]}
              mm={mm}
              onResizeStart={(partId, edge) =>
                handlePartResizeStart(focusedElement.roomId, partId, edge)
              }
              onMouseEnter={() => setHoveredRoomId(focusedElement.roomId)}
              visible={true}
            />
          )}

        {/* Offset arrows - rendered on top when part is focused */}
        {focusedElement?.type === 'part' &&
          !dragState &&
          !resizeState &&
          !partResizeState &&
          !partOffsetDragState &&
          roomMap[focusedElement.partId] &&
          (() => {
            const parentRoom = data.rooms.find(r => r.id === focusedElement.roomId);
            const originalPart = parentRoom?.parts?.find(p => p.id === focusedElement.partId);
            if (!originalPart) return null;

            const resolvedPart = roomMap[focusedElement.partId];
            if (!resolvedPart) return null;

            // Determine what the part is attached to (could be main room or another part)
            const attachToTarget = originalPart.attachTo?.split(':')[0];
            const resolvedAttachTarget = attachToTarget ? roomMap[attachToTarget] : null;
            const resolvedParent = roomMap[focusedElement.roomId];
            const targetForValidation = resolvedAttachTarget || resolvedParent;
            if (!targetForValidation) return null;

            const partRight = resolvedPart.x + resolvedPart.width;
            const partBottom = resolvedPart.y + resolvedPart.depth;
            const targetRight = targetForValidation.x + targetForValidation.width;
            const targetBottom = targetForValidation.y + targetForValidation.depth;

            // Check which direction the part extends relative to its attach target
            const extendsRight = resolvedPart.x >= targetRight;
            const extendsLeft = partRight <= targetForValidation.x;
            const extendsBottom = resolvedPart.y >= targetBottom;
            const extendsTop = partBottom <= targetForValidation.y;

            // If part extends horizontally, show vertical arrows (to slide along edge)
            // If part extends vertically, show horizontal arrows (to slide along edge)
            let showDirections: Array<'left' | 'right' | 'top' | 'bottom'>;
            if (extendsLeft || extendsRight) {
              showDirections = ['top', 'bottom'];
            } else if (extendsTop || extendsBottom) {
              showDirections = ['left', 'right'];
            } else {
              // Fallback: show all (shouldn't happen with valid parts)
              showDirections = ['left', 'right', 'top', 'bottom'];
            }

            return (
              <OffsetArrows
                room={resolvedPart}
                originalRoom={originalPart as unknown as import('../types').Room}
                mm={mm}
                onOffsetDragStart={(partId, direction) =>
                  handlePartOffsetDragStart(focusedElement.roomId, partId, direction)
                }
                onMouseEnter={() => setHoveredRoomId(focusedElement.roomId)}
                visible={true}
                showDirections={showDirections}
              />
            );
          })()}

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

      {/* Zoom controls */}
      <div className="zoom-controls" data-testid="zoom-controls">
        <button
          className="zoom-button"
          data-testid="zoom-in-button"
          onClick={() => setZoom(z => Math.min(z * 1.2, 10))}
          title="Zoom in"
        >
          +
        </button>
        <button
          className="zoom-button"
          data-testid="zoom-out-button"
          onClick={() => setZoom(z => Math.max(z / 1.2, 0.1))}
          title="Zoom out"
        >
          −
        </button>
        <button
          className="zoom-button"
          data-testid="zoom-reset-button"
          onClick={resetView}
          title="Reset view"
        >
          ⟲
        </button>
        <span className="zoom-level" data-testid="zoom-level">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const FloorplanRenderer = memo(FloorplanRendererComponent);
