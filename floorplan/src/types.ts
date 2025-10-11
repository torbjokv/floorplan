export type Anchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface RoomAddition {
  name: string;
  width: number;
  height: number;
  anchor?: Anchor;
  attachTo?: string;
  offset?: [number, number];
}

export interface Room {
  name: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  anchor?: Anchor;
  attachTo?: string;
  offset?: [number, number];
  addition?: RoomAddition[];
}

export interface Door {
  room: string;
  offset?: [number, number];
  width: number;
  depth?: number; // Wall thickness (optional, defaults to reasonable value)
  rotation?: number;
  swing?: 'left' | 'right'; // Direction the door swings
}

export interface Window {
  room: string;
  offset?: [number, number];
  width: number;
  depth?: number; // Wall thickness (optional, defaults to reasonable value)
  rotation?: number;
}

export interface FloorplanData {
  scale: number;
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
