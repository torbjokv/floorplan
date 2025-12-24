/**
 * Utility functions to find DSL line numbers for specific elements.
 * Used to highlight and scroll to lines in the DSL editor when clicking SVG elements.
 */

export interface ElementLocation {
  lineNumber: number; // 1-based line number
  startColumn: number;
  endColumn: number;
}

/**
 * Find the line number for a room definition in DSL text
 */
export function findRoomLine(dslText: string, roomId: string): ElementLocation | null {
  const lines = dslText.split('\n');
  const roomIdLower = roomId.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();

    // Match room definition: "room RoomId ..."
    if (trimmed.startsWith('room ')) {
      const match = trimmed.match(/^room\s+(\w+)/);
      if (match && match[1].toLowerCase() === roomIdLower) {
        return {
          lineNumber: i + 1,
          startColumn: line.indexOf('room') + 1,
          endColumn: line.length + 1,
        };
      }
    }
  }

  return null;
}

/**
 * Find the line number for a part definition in DSL text
 */
export function findPartLine(dslText: string, partId: string): ElementLocation | null {
  const lines = dslText.split('\n');
  const partIdLower = partId.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();

    // Match part definition: "part PartId ..."
    if (trimmed.startsWith('part ')) {
      const match = trimmed.match(/^part\s+(\w+)/);
      if (match && match[1].toLowerCase() === partIdLower) {
        return {
          lineNumber: i + 1,
          startColumn: line.search(/\S/) + 1, // First non-whitespace
          endColumn: line.length + 1,
        };
      }
    }
  }

  return null;
}

/**
 * Find the line number for a door in DSL text.
 * Doors can be:
 * 1. Freestanding (at zeropoint or absolute position)
 * 2. Inside a room (indented)
 * 3. Inside a part (double indented)
 */
export function findDoorLine(
  dslText: string,
  doorIndex: number,
  doorRoom?: string
): ElementLocation | null {
  const lines = dslText.split('\n');
  let doorCount = 0;

  // If doorRoom is provided, we're looking for a specific room's door
  const targetRoomId = doorRoom?.split(':')[0]?.toLowerCase();

  let currentRoomId: string | null = null;
  let currentPartId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();

    // Track current room context
    if (trimmed.startsWith('room ')) {
      const match = trimmed.match(/^room\s+(\w+)/);
      if (match) {
        currentRoomId = match[1].toLowerCase();
        currentPartId = null;
      }
    }

    // Track current part context
    if (trimmed.startsWith('part ')) {
      const match = trimmed.match(/^part\s+(\w+)/);
      if (match) {
        currentPartId = match[1].toLowerCase();
      }
    }

    // Match door definition
    if (trimmed.startsWith('door ')) {
      // Check if this door matches the context we're looking for
      const isInTargetRoom = targetRoomId
        ? currentRoomId === targetRoomId || currentPartId === targetRoomId
        : true;

      // For freestanding doors (no target room), only match top-level doors
      const isFreestanding = doorRoom?.startsWith('zeropoint:') || !doorRoom;
      const isTopLevel = !line.startsWith(' ') && !line.startsWith('\t');

      if (isFreestanding && isTopLevel) {
        if (doorCount === doorIndex) {
          return {
            lineNumber: i + 1,
            startColumn: line.search(/\S/) + 1,
            endColumn: line.length + 1,
          };
        }
        doorCount++;
      } else if (isInTargetRoom && !isTopLevel) {
        if (doorCount === doorIndex) {
          return {
            lineNumber: i + 1,
            startColumn: line.search(/\S/) + 1,
            endColumn: line.length + 1,
          };
        }
        doorCount++;
      }
    }
  }

  // Fallback: just find the nth door overall
  doorCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();

    if (trimmed.startsWith('door ')) {
      if (doorCount === doorIndex) {
        return {
          lineNumber: i + 1,
          startColumn: line.search(/\S/) + 1,
          endColumn: line.length + 1,
        };
      }
      doorCount++;
    }
  }

  return null;
}

/**
 * Find the line number for a window in DSL text.
 */
export function findWindowLine(
  dslText: string,
  windowIndex: number,
  windowRoom?: string
): ElementLocation | null {
  const lines = dslText.split('\n');
  let windowCount = 0;

  const targetRoomId = windowRoom?.split(':')[0]?.toLowerCase();

  let currentRoomId: string | null = null;
  let currentPartId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();

    // Track current room context
    if (trimmed.startsWith('room ')) {
      const match = trimmed.match(/^room\s+(\w+)/);
      if (match) {
        currentRoomId = match[1].toLowerCase();
        currentPartId = null;
      }
    }

    // Track current part context
    if (trimmed.startsWith('part ')) {
      const match = trimmed.match(/^part\s+(\w+)/);
      if (match) {
        currentPartId = match[1].toLowerCase();
      }
    }

    // Match window definition
    if (trimmed.startsWith('window ')) {
      const isInTargetRoom = targetRoomId
        ? currentRoomId === targetRoomId || currentPartId === targetRoomId
        : true;

      const isFreestanding = windowRoom?.startsWith('zeropoint:') || !windowRoom;
      const isTopLevel = !line.startsWith(' ') && !line.startsWith('\t');

      if (isFreestanding && isTopLevel) {
        if (windowCount === windowIndex) {
          return {
            lineNumber: i + 1,
            startColumn: line.search(/\S/) + 1,
            endColumn: line.length + 1,
          };
        }
        windowCount++;
      } else if (isInTargetRoom && !isTopLevel) {
        if (windowCount === windowIndex) {
          return {
            lineNumber: i + 1,
            startColumn: line.search(/\S/) + 1,
            endColumn: line.length + 1,
          };
        }
        windowCount++;
      }
    }
  }

  // Fallback: just find the nth window overall
  windowCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();

    if (trimmed.startsWith('window ')) {
      if (windowCount === windowIndex) {
        return {
          lineNumber: i + 1,
          startColumn: line.search(/\S/) + 1,
          endColumn: line.length + 1,
        };
      }
      windowCount++;
    }
  }

  return null;
}

/**
 * Find the line number for an object in DSL text.
 */
export function findObjectLine(
  dslText: string,
  roomId: string,
  objectIndex: number
): ElementLocation | null {
  const lines = dslText.split('\n');
  const roomIdLower = roomId.toLowerCase();

  let currentRoomId: string | null = null;
  let currentPartId: string | null = null;
  let objectCount = 0;
  let inTargetContext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();

    // Track current room context
    if (trimmed.startsWith('room ')) {
      const match = trimmed.match(/^room\s+(\w+)/);
      if (match) {
        currentRoomId = match[1].toLowerCase();
        currentPartId = null;
        inTargetContext = currentRoomId === roomIdLower;
        objectCount = 0; // Reset count when entering a new room
      }
    }

    // Track current part context
    if (trimmed.startsWith('part ')) {
      const match = trimmed.match(/^part\s+(\w+)/);
      if (match) {
        currentPartId = match[1].toLowerCase();
        inTargetContext = currentPartId === roomIdLower;
        objectCount = 0; // Reset count when entering a new part
      }
    }

    // Match object definition within the target room/part
    if (trimmed.startsWith('object ') && inTargetContext) {
      if (objectCount === objectIndex) {
        return {
          lineNumber: i + 1,
          startColumn: line.search(/\S/) + 1,
          endColumn: line.length + 1,
        };
      }
      objectCount++;
    }
  }

  return null;
}

/**
 * Find the line number for a freestanding object (at absolute position)
 */
export function findFreestandingObjectLine(
  dslText: string,
  objectIndex: number
): ElementLocation | null {
  const lines = dslText.split('\n');
  let objectCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim().toLowerCase();

    // Match top-level object definition (not indented)
    const isTopLevel = !line.startsWith(' ') && !line.startsWith('\t');
    if (trimmed.startsWith('object ') && isTopLevel) {
      if (objectCount === objectIndex) {
        return {
          lineNumber: i + 1,
          startColumn: 1,
          endColumn: line.length + 1,
        };
      }
      objectCount++;
    }
  }

  return null;
}
