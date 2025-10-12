export type Anchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface RoomAddition {
  name: string;
  width: number;
  depth: number;
  anchor?: Anchor;
  attachTo?: string;
  offset?: [number, number];
}

export interface Room {
  name: string;
  width: number;
  depth: number;
  x?: number;
  y?: number;
  anchor?: Anchor;
  attachTo?: string;
  offset?: [number, number];
  addition?: RoomAddition[];
}

export type WallPosition = 'top' | 'bottom' | 'left' | 'right';
export type SwingDirection = 'inwards-left' | 'inwards-right' | 'outwards-left' | 'outwards-right';

export interface Door {
  room: string; // Format: "RoomName:wall" e.g., "Living Room:left"
  offset?: number; // Distance along the wall from the wall's start
  width: number;
  swing?: SwingDirection; // Direction the door swings (defaults to inwards-right)
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
