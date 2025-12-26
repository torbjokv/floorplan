import type { Extension } from '@codemirror/state';

// Documentation for each DSL element type
export const dslDocs: Record<string, { title: string; syntax: string; description: string }> = {
  grid: {
    title: 'Grid',
    syntax: 'grid STEP',
    description: 'Sets the grid step size in millimeters (e.g., grid 1000)',
  },
  room: {
    title: 'Room',
    syntax: 'room ID [LABEL] WxD [ANCHOR] [at Target[:ANCHOR]] [(X, Y)]',
    description:
      'Defines a room. First room is at origin. Others attach via "at RoomId:corner". Example: room Kitchen 4000x3000 at LivingRoom:bottom-right',
  },
  part: {
    title: 'Part',
    syntax: '    part ID [LABEL] WxD [ANCHOR] at Target[:ANCHOR] [(X, Y)]',
    description:
      'Nested room part for complex shapes. Attaches to parent room or other parts. Can contain doors, windows, objects.',
  },
  window: {
    title: 'Window',
    syntax: '    window WIDTH at WALL [(OFFSET)]',
    description:
      'Window on a wall. WIDTH in mm, WALL is top/bottom/left/right, OFFSET along wall. Example: window 1200 at top (300)',
  },
  door: {
    title: 'Door',
    syntax: '    door WIDTH [SWING] at WALL [(OFFSET)]',
    description:
      'Door on a wall. SWING: inwards-left/right, outwards-left/right, or opening (no arc). Example: door 900 inwards-right at right (1000)',
  },
  object: {
    title: 'Object',
    syntax: '    object TYPE [LABEL] WxD|W [COLOR] at [ANCHOR] [(X, Y)]',
    description:
      'Decorative object (square or circle). Example: object square "Table" 800x800 #33d17a at bottom-left (100, 100)',
  },
};

// Detect which element type is on a given line
export function detectElementType(line: string): string | null {
  const trimmed = line.trim().toLowerCase();

  if (trimmed.startsWith('grid ')) return 'grid';
  if (trimmed.startsWith('room ')) return 'room';
  if (trimmed.startsWith('part ')) return 'part';
  if (trimmed.startsWith('window ')) return 'window';
  if (trimmed.startsWith('door ')) return 'door';
  if (trimmed.startsWith('object ')) return 'object';

  return null;
}

// Empty extension - documentation is now handled by React component in DSLEditor
export const dslDocsExtension: Extension = [];
