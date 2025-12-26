import { EditorView, showPanel, Panel } from '@codemirror/view';
import { Extension } from '@codemirror/state';

// Documentation for each DSL element type
const dslDocs: Record<string, { title: string; syntax: string; description: string }> = {
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
function detectElementType(line: string): string | null {
  const trimmed = line.trim().toLowerCase();

  if (trimmed.startsWith('grid ')) return 'grid';
  if (trimmed.startsWith('room ')) return 'room';
  if (trimmed.startsWith('part ')) return 'part';
  if (trimmed.startsWith('window ')) return 'window';
  if (trimmed.startsWith('door ')) return 'door';
  if (trimmed.startsWith('object ')) return 'object';

  return null;
}

// Create the documentation panel element
function createDocsPanel(view: EditorView): Panel {
  const dom = document.createElement('div');
  dom.className = 'cm-dsl-docs-panel';

  function update() {
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const elementType = detectElementType(line.text);

    if (elementType && dslDocs[elementType]) {
      const doc = dslDocs[elementType];
      dom.innerHTML = `
        <span class="cm-dsl-docs-title">${doc.title}</span>
        <code class="cm-dsl-docs-syntax">${doc.syntax}</code>
        <span class="cm-dsl-docs-desc">${doc.description}</span>
      `;
      dom.style.display = 'flex';
    } else {
      dom.style.display = 'none';
    }
  }

  update();

  return {
    dom,
    update,
  };
}

// Panel extension that shows documentation
const docsPanel = showPanel.of(createDocsPanel);

// Theme for the documentation panel
const docsPanelTheme = EditorView.theme({
  '.cm-dsl-docs-panel': {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 12px',
    backgroundColor: '#1e1e1e',
    borderTop: '1px solid #3c3c3c',
    fontSize: '12px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#cccccc',
    minHeight: '28px',
  },
  '.cm-dsl-docs-title': {
    color: '#569cd6',
    fontWeight: 'bold',
    flexShrink: '0',
  },
  '.cm-dsl-docs-syntax': {
    color: '#4ec9b0',
    backgroundColor: '#2d2d2d',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '11px',
    fontFamily: 'Consolas, Monaco, monospace',
    flexShrink: '0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '400px',
  },
  '.cm-dsl-docs-desc': {
    color: '#9cdcfe',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-panels-bottom': {
    borderTop: 'none',
  },
});

// Export the complete extension
export const dslDocsExtension: Extension = [docsPanel, docsPanelTheme];

// Export for testing
export { detectElementType, dslDocs };
