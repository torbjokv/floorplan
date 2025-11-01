/**
 * Registry to track parts and their relationships to parent rooms
 * Encapsulates part-related lookups and queries
 */
export class PartRegistry {
  private partIds: Set<string>;
  private partToParent: Map<string, string>;

  constructor() {
    this.partIds = new Set();
    this.partToParent = new Map();
  }

  /**
   * Register a part with its parent room
   */
  registerPart(partId: string, parentRoomId: string): void {
    this.partIds.add(partId);
    this.partToParent.set(partId, parentRoomId);
  }

  /**
   * Check if an ID belongs to a part (not a top-level room)
   */
  isPart(id: string): boolean {
    return this.partIds.has(id);
  }

  /**
   * Get the parent room ID for a part
   * Returns undefined if the ID is not a part
   */
  getParentId(partId: string): string | undefined {
    return this.partToParent.get(partId);
  }

  /**
   * Get the effective room ID for dragging purposes
   * If the ID is a part, returns its parent room ID
   * Otherwise returns the ID itself
   */
  getRoomIdForDrag(id: string): string {
    return this.partToParent.get(id) || id;
  }

  /**
   * Check if a room or its parent is being dragged
   */
  isRoomOrParentDragging(roomId: string, draggedRoomId: string): boolean {
    return roomId === draggedRoomId || this.getParentId(roomId) === draggedRoomId;
  }

  /**
   * Get all part IDs (for filtering)
   */
  getAllPartIds(): Set<string> {
    return this.partIds;
  }

  /**
   * Clear all registered parts
   */
  clear(): void {
    this.partIds.clear();
    this.partToParent.clear();
  }
}
