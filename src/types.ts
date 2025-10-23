export type Anchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface RoomPart {
  id: string;
  name?: string; // Display name (optional)
  width: number;
  depth: number;
  anchor?: Anchor;
  attachTo?: string;
  offset?: [number, number];
}

export interface RoomObject {
  type: 'square' | 'circle';
  x: number;
  y: number;
  width?: number; // For squares
  height?: number; // For squares
  radius?: number; // For circles
  color?: string;
  text?: string; // Optional text in center
  anchor?: Anchor; // For squares only - which corner of the object is the anchor point
  roomAnchor?: Anchor; // Which corner of the room the x,y coordinates reference
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
export type SwingDirection = 'inwards-left' | 'inwards-right' | 'outwards-left' | 'outwards-right';

export interface Door {
  room: string; // Format: "RoomName:wall" e.g., "Living Room:left"
  offset?: number; // Distance along the wall from the wall's start
  width: number;
  swing?: SwingDirection; // Direction the door swings (defaults to inwards-right)
  type?: 'normal' | 'opening'; // 'normal' shows door blade, 'opening' shows just the opening
}

export interface Window {
  room: string; // Format: "RoomName:wall" e.g., "Living Room:top"
  offset?: number; // Distance along the wall from the wall's start
  width: number;
}

export interface FloorplanData {
  grid_step: number;
  rooms: Room[];
  doors?: Door[];
  windows?: Window[];
}

export interface ResolvedRoom extends Room {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}
