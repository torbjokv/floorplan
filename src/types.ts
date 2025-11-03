export type Anchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface RoomPart {
  id: string;
  name?: string; // Display name (optional)
  width: number;
  depth: number;
  anchor?: Anchor;
  attachTo: string; // Required. Format: "roomId:corner" or "parent:corner"
  offset?: [number, number];
  objects?: RoomObject[];
}

export interface RoomObject {
  type: 'square' | 'circle';
  x: number;
  y: number;
  width: number; // Width for squares, diameter for circles
  height?: number; // Height for squares (if omitted, uses width for square objects)
  color?: string;
  text?: string; // Optional text in center
  anchor?: Anchor; // Which object point to anchor
  roomAnchor?: Anchor; // Which room corner to attach to (defaults to top-left)
}

export interface Room {
  id: string; // Required unique identifier (e.g., "livingroom1", "kitchen1")
  name?: string; // Optional display name
  width: number;
  depth: number;
  anchor?: Anchor; // Which corner of this room attaches to the reference point (defaults to top-left)
  attachTo: string; // Required. Format: "roomId:corner" or "zeropoint:top-left"
  offset?: [number, number]; // Offset from the attachment point (defaults to [0, 0])
  parts?: RoomPart[];
  objects?: RoomObject[];
}

export type WallPosition = 'top' | 'bottom' | 'left' | 'right';
export type SwingDirection =
  | 'inwards-left'
  | 'inwards-right'
  | 'outwards-left'
  | 'outwards-right'
  | 'opening'; // No door blade, just the opening

export interface Door {
  room?: string; // Format: "RoomName:wall" e.g., "Living Room:left". Undefined if freestanding.
  offset?: number; // Distance along the wall from the wall's start (for wall-attached)
  width: number;
  swing?: SwingDirection; // Direction the door swings, or 'opening' for no door blade (defaults to inwards-right)
  type?: 'normal' | 'opening'; // Type of door
  x?: number; // Absolute x coordinate (for freestanding doors)
  y?: number; // Absolute y coordinate (for freestanding doors)
  rotation?: number; // Rotation in degrees (for freestanding doors)
}

export interface Window {
  room?: string; // Format: "RoomName:wall" e.g., "Living Room:top". Undefined if freestanding.
  offset?: number; // Distance along the wall from the wall's start (for wall-attached)
  width: number;
  x?: number; // Absolute x coordinate (for freestanding windows)
  y?: number; // Absolute y coordinate (for freestanding windows)
  rotation?: number; // Rotation in degrees (for freestanding windows)
}

export interface FloorplanData {
  grid_step: number;
  rooms: Room[];
  doors?: Door[];
  windows?: Window[];
  objects?: RoomObject[]; // Freestanding objects at absolute coordinates
}

// Alias for FloorplanData to support both naming conventions
export type FloorplanConfig = FloorplanData;

export interface ResolvedRoom extends Room {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}
