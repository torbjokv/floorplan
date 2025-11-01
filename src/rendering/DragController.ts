import type { Anchor, Room, ResolvedRoom } from '../types';
import { getCorner } from '../utils';

const SNAP_DISTANCE = 500; // mm - distance to snap to another corner
const MOVEMENT_THRESHOLD = 100; // mm - minimum movement to be considered significant

export interface DragState {
  roomId: string;
  dragType: 'corner' | 'center';
  anchor?: Anchor;
  startMouseX: number;
  startMouseY: number;
  startRoomX: number;
  startRoomY: number;
}

export interface CornerHighlight {
  roomId: string;
  corner: Anchor;
}

export interface DragOffset {
  x: number;
  y: number;
}

/**
 * Manages all drag-related state and operations
 */
export class DragController {
  private dragState: DragState | null = null;
  private dragOffset: DragOffset | null = null;
  private snapTarget: CornerHighlight | null = null;
  private hoveredCorner: CornerHighlight | null = null;
  private connectedRooms: Set<string> = new Set();
  private animationFrameId: number | null = null;

  /**
   * Get current drag state
   */
  getDragState(): DragState | null {
    return this.dragState;
  }

  /**
   * Get current drag offset
   */
  getDragOffset(): DragOffset | null {
    return this.dragOffset;
  }

  /**
   * Get current snap target
   */
  getSnapTarget(): CornerHighlight | null {
    return this.snapTarget;
  }

  /**
   * Get hovered corner
   */
  getHoveredCorner(): CornerHighlight | null {
    return this.hoveredCorner;
  }

  /**
   * Get connected rooms
   */
  getConnectedRooms(): Set<string> {
    return this.connectedRooms;
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.dragState !== null;
  }

  /**
   * Start dragging a room
   */
  startDrag(
    roomId: string,
    room: ResolvedRoom,
    mouseX: number,
    mouseY: number,
    dragType: 'corner' | 'center',
    anchor?: Anchor,
    connectedRooms?: Set<string>
  ): void {
    this.dragState = {
      roomId,
      dragType,
      anchor,
      startMouseX: mouseX,
      startMouseY: mouseY,
      startRoomX: room.x,
      startRoomY: room.y,
    };
    this.connectedRooms = connectedRooms || new Set();
  }

  /**
   * Update drag position
   */
  updateDrag(
    mouseX: number,
    mouseY: number,
    room: ResolvedRoom,
    allRooms: Record<string, ResolvedRoom>,
    onUpdate: (offset: DragOffset, snapTarget: CornerHighlight | null) => void
  ): void {
    if (!this.dragState) return;

    // Cancel any pending animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Schedule update for next animation frame
    this.animationFrameId = requestAnimationFrame(() => {
      if (!this.dragState) return;

      let deltaX: number;
      let deltaY: number;

      if (this.dragState.dragType === 'corner' && this.dragState.anchor) {
        // When dragging by corner, calculate offset to move that corner to mouse position
        const cornerPos = getCorner(room, this.dragState.anchor);
        deltaX = mouseX - cornerPos.x;
        deltaY = mouseY - cornerPos.y;
      } else {
        // When dragging by center, use simple delta from start
        deltaX = mouseX - this.dragState.startMouseX;
        deltaY = mouseY - this.dragState.startMouseY;
      }

      this.dragOffset = { x: deltaX, y: deltaY };

      // Check for snap targets when dragging by corner
      let newSnapTarget: CornerHighlight | null = null;
      if (this.dragState.dragType === 'corner' && this.dragState.anchor) {
        newSnapTarget = this.findSnapTarget(mouseX, mouseY, allRooms);
      }

      this.snapTarget = newSnapTarget;
      onUpdate(this.dragOffset, this.snapTarget);
    });
  }

  /**
   * Find snap target for current drag position
   */
  private findSnapTarget(
    mouseX: number,
    mouseY: number,
    allRooms: Record<string, ResolvedRoom>
  ): CornerHighlight | null {
    if (!this.dragState || this.dragState.dragType !== 'corner') return null;

    for (const otherRoom of Object.values(allRooms)) {
      if (otherRoom.id === this.dragState.roomId) continue;

      const corners: Anchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      for (const corner of corners) {
        const otherPos = getCorner(otherRoom, corner);
        const dist = Math.sqrt(Math.pow(mouseX - otherPos.x, 2) + Math.pow(mouseY - otherPos.y, 2));

        if (dist < SNAP_DISTANCE) {
          return { roomId: otherRoom.id, corner };
        }
      }
    }

    return null;
  }

  /**
   * End drag and calculate final room position
   */
  endDrag(room: Room, resolvedRoom: ResolvedRoom, onUpdate?: (updatedRoom: Room) => void): void {
    // Cancel any pending animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (!this.dragState || !this.dragOffset) {
      this.clear();
      return;
    }

    const hasMoved =
      Math.abs(this.dragOffset.x) > MOVEMENT_THRESHOLD ||
      Math.abs(this.dragOffset.y) > MOVEMENT_THRESHOLD;

    if (!hasMoved && !this.dragOffset) {
      this.clear();
      return;
    }

    if (onUpdate) {
      const updatedRoom = this.calculateUpdatedRoom(room, resolvedRoom, hasMoved);
      onUpdate(updatedRoom);
    }

    this.clear();
  }

  /**
   * Calculate updated room position based on drag
   */
  private calculateUpdatedRoom(room: Room, resolvedRoom: ResolvedRoom, hasMoved: boolean): Room {
    if (!this.dragState || !this.dragOffset) return room;

    const updatedRoom = { ...room };

    if (
      this.dragState.dragType === 'corner' &&
      this.dragState.anchor &&
      this.snapTarget &&
      hasMoved
    ) {
      // Snap to target corner
      updatedRoom.attachTo = `${this.snapTarget.roomId}:${this.snapTarget.corner}`;
      updatedRoom.anchor = this.dragState.anchor;
      delete updatedRoom.offset;
    } else if (
      this.dragState.dragType === 'corner' &&
      this.dragState.anchor &&
      !this.snapTarget &&
      hasMoved
    ) {
      // No snap target - attach to zeropoint with offset
      const cornerPos = getCorner(resolvedRoom, this.dragState.anchor);
      const newCornerX = cornerPos.x + this.dragOffset.x;
      const newCornerY = cornerPos.y + this.dragOffset.y;
      updatedRoom.attachTo = 'zeropoint:top-left';
      updatedRoom.anchor = this.dragState.anchor;
      updatedRoom.offset = [newCornerX, newCornerY];
    } else if (this.dragState.dragType === 'corner' && this.dragState.anchor && !hasMoved) {
      // Tiny movement - adjust offset
      this.adjustRoomOffset(updatedRoom, resolvedRoom, this.dragState.anchor);
    } else if (this.dragState.dragType === 'center' && hasMoved) {
      // Center drag - attach to zeropoint with offset
      const newX = resolvedRoom.x + this.dragOffset.x;
      const newY = resolvedRoom.y + this.dragOffset.y;
      updatedRoom.attachTo = 'zeropoint:top-left';
      updatedRoom.anchor = 'top-left';
      updatedRoom.offset = [newX, newY];
    } else if (this.dragState.dragType === 'center' && !hasMoved) {
      // Tiny center movement
      this.adjustRoomOffsetCenter(updatedRoom, resolvedRoom);
    }

    return updatedRoom;
  }

  /**
   * Adjust room offset for small corner movements
   */
  private adjustRoomOffset(room: Room, resolvedRoom: ResolvedRoom, anchor: Anchor): void {
    if (!this.dragOffset || !room.attachTo) return;

    if (room.attachTo.startsWith('zeropoint:')) {
      const cornerPos = getCorner(resolvedRoom, anchor);
      const newCornerX = cornerPos.x + this.dragOffset.x;
      const newCornerY = cornerPos.y + this.dragOffset.y;
      room.offset = [newCornerX, newCornerY];
    } else {
      const cornerPos = getCorner(resolvedRoom, anchor);
      const newCornerX = cornerPos.x + this.dragOffset.x;
      const newCornerY = cornerPos.y + this.dragOffset.y;
      room.attachTo = 'zeropoint:top-left';
      room.anchor = anchor;
      room.offset = [newCornerX, newCornerY];
    }
  }

  /**
   * Adjust room offset for small center movements
   */
  private adjustRoomOffsetCenter(room: Room, resolvedRoom: ResolvedRoom): void {
    if (!this.dragOffset) return;

    const newX = resolvedRoom.x + this.dragOffset.x;
    const newY = resolvedRoom.y + this.dragOffset.y;

    if (room.attachTo?.startsWith('zeropoint:')) {
      room.offset = [newX, newY];
    } else {
      room.attachTo = 'zeropoint:top-left';
      room.anchor = 'top-left';
      room.offset = [newX, newY];
    }
  }

  /**
   * Update hovered corner
   */
  setHoveredCorner(corner: CornerHighlight | null): void {
    this.hoveredCorner = corner;
  }

  /**
   * Clear all drag state
   */
  clear(): void {
    this.dragState = null;
    this.dragOffset = null;
    this.snapTarget = null;
    this.connectedRooms = new Set();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.clear();
  }
}
