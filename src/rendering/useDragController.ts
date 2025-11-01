import { useState, useRef, useEffect, useCallback } from 'react';
import type { FloorplanData, ResolvedRoom } from '../types';
import {
  DragController,
  type DragState,
  type CornerHighlight,
  type DragOffset,
} from './DragController';
import { CoordinateTransform } from './CoordinateTransform';

interface UseDragControllerProps {
  data: FloorplanData;
  roomMap: Record<string, ResolvedRoom>;
  compositeRoomPartsMap: Map<string, Array<{ x: number; y: number; width: number; depth: number }>>;
  svgRef: React.RefObject<SVGSVGElement>;
  onRoomUpdate?: (updatedData: FloorplanData) => void;
}

/**
 * Custom hook to manage drag operations
 */
export function useDragController({
  data,
  roomMap,
  compositeRoomPartsMap,
  svgRef,
  onRoomUpdate,
}: UseDragControllerProps) {
  const controllerRef = useRef<DragController>(new DragController());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOffset, setDragOffset] = useState<DragOffset | null>(null);
  const [snapTarget, setSnapTarget] = useState<CornerHighlight | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<CornerHighlight | null>(null);
  const [connectedRooms, setConnectedRooms] = useState<Set<string>>(new Set());

  // Cleanup on unmount
  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      controller.dispose();
    };
  }, []);

  /**
   * Find all rooms that are attached to the given room
   */
  const findConnectedRooms = useCallback(
    (rootRoomId: string): Set<string> => {
      const connected = new Set<string>();
      const toCheck = [rootRoomId];

      while (toCheck.length > 0) {
        const currentId = toCheck.pop()!;
        if (connected.has(currentId)) continue;
        connected.add(currentId);

        data.rooms.forEach(room => {
          const attachTo = room.attachTo?.split(':')[0];
          if (attachTo === currentId && !connected.has(room.id)) {
            toCheck.push(room.id);
          }
        });
      }

      connected.delete(rootRoomId);
      return connected;
    },
    [data.rooms]
  );

  /**
   * Handle mouse down to start dragging
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGElement>, roomId: string) => {
      e.stopPropagation();
      const { x, y } = CoordinateTransform.screenToMM(svgRef.current, e.clientX, e.clientY);
      const room = roomMap[roomId];
      if (!room) return;

      const connected = findConnectedRooms(roomId);
      setConnectedRooms(connected);

      // Check if clicking on corner
      const closest = CoordinateTransform.findClosestCorner(room, x, y);
      if (closest) {
        controllerRef.current.startDrag(roomId, room, x, y, 'corner', closest.corner, connected);
        setDragState(controllerRef.current.getDragState());
      } else if (CoordinateTransform.isInsideRoomCenter(room, x, y)) {
        controllerRef.current.startDrag(roomId, room, x, y, 'center', undefined, connected);
        setDragState(controllerRef.current.getDragState());
      }
    },
    [roomMap, svgRef, findConnectedRooms]
  );

  /**
   * Handle mouse move for hover and drag
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const { x, y } = CoordinateTransform.screenToMM(svgRef.current, e.clientX, e.clientY);

      if (controllerRef.current.isDragging()) {
        const controller = controllerRef.current;
        const state = controller.getDragState();
        if (!state) return;

        const room = roomMap[state.roomId];
        if (!room) return;

        controller.updateDrag(x, y, room, roomMap, (offset, snap) => {
          setDragOffset(offset);
          setSnapTarget(snap);
        });
      } else {
        // Handle hover detection
        let foundHover = false;

        for (const room of Object.values(roomMap)) {
          const parts = compositeRoomPartsMap.get(room.id) || [];
          if (CoordinateTransform.isPointInRoom(room, x, y, parts)) {
            const closest = CoordinateTransform.findClosestCorner(room, x, y);
            if (closest) {
              const newHovered = { roomId: room.id, corner: closest.corner };
              setHoveredCorner(newHovered);
              controllerRef.current.setHoveredCorner(newHovered);
              foundHover = true;
            }
            break;
          }
        }

        if (!foundHover) {
          setHoveredCorner(null);
          controllerRef.current.setHoveredCorner(null);
        }
      }
    },
    [roomMap, compositeRoomPartsMap, svgRef]
  );

  /**
   * Handle mouse up to finish dragging
   */
  const handleMouseUp = useCallback(() => {
    if (!controllerRef.current.isDragging() || !onRoomUpdate) {
      controllerRef.current.clear();
      setDragState(null);
      setDragOffset(null);
      setSnapTarget(null);
      setConnectedRooms(new Set());
      return;
    }

    const state = controllerRef.current.getDragState();
    if (!state) return;

    const room = data.rooms.find(r => r.id === state.roomId);
    const resolvedRoom = roomMap[state.roomId];
    if (!room || !resolvedRoom) {
      controllerRef.current.clear();
      setDragState(null);
      setDragOffset(null);
      setSnapTarget(null);
      setConnectedRooms(new Set());
      return;
    }

    controllerRef.current.endDrag(room, resolvedRoom, updatedRoom => {
      const updatedRooms = data.rooms.map(r => (r.id === state.roomId ? updatedRoom : r));
      onRoomUpdate({ ...data, rooms: updatedRooms });
    });

    setDragState(null);
    setDragOffset(null);
    setSnapTarget(null);
    setConnectedRooms(new Set());
  }, [data, roomMap, onRoomUpdate]);

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (controllerRef.current.isDragging()) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleMouseUp]);

  return {
    dragState,
    dragOffset,
    snapTarget,
    hoveredCorner,
    connectedRooms,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
