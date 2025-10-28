// @ts-expect-error - Generated parser file has no type definitions
import { parse } from './floorplan-parser.js';
import type { FloorplanConfig, Room, Door, Window, RoomObject } from './types';

export interface DSLError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Parse DSL text into a FloorplanConfig object
 */
export function parseDSL(dslText: string): {
  config: FloorplanConfig | null;
  errors: DSLError[];
} {
  try {
    const parsed = parse(dslText);

    const config: FloorplanConfig = {
      ...parsed,
      doors: parsed.doors && parsed.doors.length > 0 ? parsed.doors : undefined,
      windows: parsed.windows && parsed.windows.length > 0 ? parsed.windows : undefined,
    };

    return { config, errors: [] };
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      location?: { start?: { line?: number; column?: number } };
      stack?: string;
    };
    const errorMessage = err.message || 'Unknown parsing error';
    const location = err.location || {};

    // Log the full error with stack trace to console for debugging
    console.error('DSL Parse Error:', {
      message: errorMessage,
      location,
      stack: err.stack,
      fullError: error,
    });

    // Log the actual DSL text being parsed and build enhanced error message
    let enhancedMessage = errorMessage;
    if (location.start?.line !== undefined && location.start?.column !== undefined) {
      const lines = dslText.split('\n');
      const lineNum = location.start.line - 1;
      const colNum = location.start.column - 1;

      const contextInfo = {
        lineNumber: location.start.line,
        lineText: lines[lineNum],
        problemAt: ' '.repeat(colNum) + '^',
        contextBefore: lines.slice(Math.max(0, lineNum - 2), lineNum),
        contextAfter: lines.slice(lineNum + 1, lineNum + 3),
      };

      console.error('Problematic line:', contextInfo);

      // Build enhanced error message with context
      enhancedMessage = `${errorMessage}\n\nLine ${contextInfo.lineNumber}:\n${contextInfo.lineText}\n${contextInfo.problemAt}`;

      if (contextInfo.contextBefore.length > 0) {
        enhancedMessage = `Context:\n${contextInfo.contextBefore.join('\n')}\n\n${enhancedMessage}`;
      }

      if (contextInfo.contextAfter.length > 0) {
        enhancedMessage += `\n${contextInfo.contextAfter.join('\n')}`;
      }
    }

    return {
      config: null,
      errors: [
        {
          message: enhancedMessage,
          line: location.start?.line,
          column: location.start?.column,
        },
      ],
    };
  }
}

/**
 * Convert a FloorplanConfig object to DSL text
 */
export function jsonToDSL(config: FloorplanConfig): string {
  const lines: string[] = [];

  // Add grid setting if present
  if (config.grid_step) {
    lines.push(`grid ${config.grid_step}`);
    lines.push('');
  }

  // Process each room
  config.rooms?.forEach((room: Room, index: number) => {
    lines.push(formatRoom(room, config.doors, config.windows));

    // Add blank line between rooms (except after last room)
    if (index < (config.rooms?.length || 0) - 1) {
      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Format a single room as DSL text
 */
function formatRoom(room: Room, doors?: Door[], windows?: Window[]): string {
  const lines: string[] = [];

  // Build room definition line
  let roomLine = `room ${capitalizeId(room.id)}`;

  if (room.name) {
    roomLine += ` "${room.name}"`;
  }

  roomLine += ` ${room.width}x${room.depth}`;

  if (room.anchor && room.anchor !== 'top-left') {
    roomLine += ` ${room.anchor}`;
  }

  // Parse attachTo
  const attachInfo = parseAttachTo(room.attachTo);
  roomLine += ` at ${attachInfo.target}`;

  if (attachInfo.anchor && attachInfo.anchor !== 'bottom-right') {
    roomLine += `:${attachInfo.anchor}`;
  }

  if (room.offset && (room.offset[0] !== 0 || room.offset[1] !== 0)) {
    roomLine += ` (${room.offset[0]}, ${room.offset[1]})`;
  }

  lines.push(roomLine);

  // Add room-level children (windows, doors, objects)
  const roomWindows = windows?.filter(w => w.room?.startsWith(`${room.id}:`));
  const roomDoors = doors?.filter(d => d.room?.startsWith(`${room.id}:`));

  roomWindows?.forEach(window => {
    lines.push(formatWindow(window, '    '));
  });

  roomDoors?.forEach(door => {
    lines.push(formatDoor(door, '    '));
  });

  room.objects?.forEach(obj => {
    lines.push(formatObject(obj, '    '));
  });

  // Add parts
  room.parts?.forEach(part => {
    lines.push(formatPart(part, doors, windows));
  });

  return lines.join('\n');
}

/**
 * Format a part as DSL text
 */
function formatPart(part: Room, doors?: Door[], windows?: Window[]): string {
  const lines: string[] = [];

  let partLine = `    part ${capitalizeId(part.id)} ${part.width}x${part.depth}`;

  if (part.anchor && part.anchor !== 'top-left') {
    partLine += ` ${part.anchor}`;
  }

  // Parse attachTo
  const attachInfo = parseAttachTo(part.attachTo);
  const target = attachInfo.target === 'parent' ? 'room' : capitalizeId(attachInfo.target);
  partLine += ` at ${target}`;

  if (attachInfo.anchor && attachInfo.anchor !== 'bottom-right') {
    partLine += `:${attachInfo.anchor}`;
  }

  if (part.offset && (part.offset[0] !== 0 || part.offset[1] !== 0)) {
    partLine += ` (${part.offset[0]}, ${part.offset[1]})`;
  }

  lines.push(partLine);

  // Add part-level children
  const partWindows = windows?.filter(w => w.room?.startsWith(`${part.id}:`));
  const partDoors = doors?.filter(d => d.room?.startsWith(`${part.id}:`));

  partWindows?.forEach(window => {
    lines.push(formatWindow(window, '        '));
  });

  partDoors?.forEach(door => {
    lines.push(formatDoor(door, '        '));
  });

  part.objects?.forEach(obj => {
    lines.push(formatObject(obj, '        '));
  });

  return lines.join('\n');
}

/**
 * Format a window as DSL text
 */
function formatWindow(window: Window, indent: string): string {
  if (!window.room) return '';
  const wall = window.room.split(':')[1];
  let line = `${indent}window ${window.width} at ${wall}`;

  if (window.offset && window.offset !== 0) {
    line += ` (${window.offset})`;
  }

  return line;
}

/**
 * Format a door as DSL text
 */
function formatDoor(door: Door, indent: string): string {
  if (!door.room) return '';
  const wall = door.room.split(':')[1];
  let line = `${indent}door ${door.width}`;

  // Add swing direction if not default
  if (door.type === 'opening') {
    line += ' opening';
  } else if (door.swing && door.swing !== 'inwards-left') {
    line += ` ${door.swing}`;
  }

  line += ` at ${wall}`;

  if (door.offset && door.offset !== 0) {
    line += ` (${door.offset})`;
  }

  return line;
}

/**
 * Format an object as DSL text
 */
function formatObject(obj: RoomObject, indent: string): string {
  let line = `${indent}object ${obj.type}`;

  if (obj.text) {
    line += ` "${obj.text}"`;
  }

  if (obj.type === 'square' && obj.height) {
    line += ` ${obj.width}x${obj.height}`;
  } else {
    line += ` ${obj.width}`; // For circles, width is the diameter
  }

  if (obj.color && obj.color !== '#ffffff') {
    line += ` ${obj.color}`;
  }

  line += ` at ${obj.roomAnchor || 'top-left'}`;

  if (obj.x !== 0 || obj.y !== 0) {
    line += ` (${obj.x}, ${obj.y})`;
  }

  return line;
}

/**
 * Parse an attachTo string into target and anchor
 */
function parseAttachTo(attachTo: string): {
  target: string;
  anchor: string;
} {
  const parts = attachTo.split(':');
  return {
    target: parts[0],
    anchor: parts[1] || 'bottom-right',
  };
}

/**
 * Capitalize the first letter of each word in an ID
 */
function capitalizeId(id: string): string {
  return id
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}
