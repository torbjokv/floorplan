# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based SVG floorplan designer built with React, TypeScript, and Vite. The application uses a **DSL-first approach** where users define floor plans using a custom Domain-Specific Language (DSL), with internal JSON representation for data storage.

## Development Commands

- `npm run dev` - Start Vite development server with HMR
- `npm run build` - Run full build pipeline (peggy, lint, format check, TypeScript, Vite build)
- `npm run lint` - Run ESLint on the codebase
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run preview` - Preview the production build locally
- `npm run peggy:generate` - Generate PEG parser from grammar
- `npm test` - Run all tests (~5 minutes, 145 scenarios)
- `npm run test:headed` - Run tests in headed mode (see browser)

## General claude behavoiur

- Be very pessimistic when testing, test the smallest part possible, like a single test, or one single suite. Then when everything works, then do the full test.
- **NEVER run the full test suite unless explicitly asked**. Always run single tests or specific feature tests.
- When testing, do not grep. Prefer to get the full output but if too large, pass to file and look at that.
- adding timeout to tests is never a good solution. always find out why it times out. the error is most likely a test step issue.
- Do not commit changes to package-lock.json unless package.json was also modified.

## Architecture

### Core Positioning System

The application uses a **relative positioning system** where rooms attach to each other:

1. **First room as anchor**: The first room (without explicit `at` clause) becomes the anchor at origin
2. **Room-based positioning**: Other rooms attach to existing rooms - `at RoomId:corner`
3. **Offset adjustment**: Fine-tune position with `(x, y)` offset
4. **Position normalization**: All positions are normalized so the top-left-most object is at (0,0)

**Key Feature**: The origin is always the top-left corner of the top-left-most room. Rooms without an `at` clause are placed at the origin. Other rooms attach to existing rooms using corner references.

This system is implemented in [src/positioning/](src/positioning/):

- `RoomPositionResolver`: Iteratively resolves room positions with automatic normalization
- `PositionCalculator`: Calculate corner positions and anchor offsets
- `resolveCompositeRoom()`: Resolves positions for room parts that can reference parent or other parts

**Backward compatibility**: The `zeropoint` keyword is still accepted in DSL but not required - rooms without `at` clause default to origin placement.

### Component Architecture

- **[App.tsx](src/App.tsx)**: Main application component with DSL editor, project management, and preview. Features:
  - DSL is the primary data format (stored in undo/redo history)
  - 500ms debounced auto-update when DSL text, project ID, or project name changes
  - URL-based persistence (project ID + project name + DSL encoded in hash)
  - localStorage-based project management with auto-save (1s debounce)
  - Dark theme UI
  - Project controls in preview section header
  - Undo/redo functionality with history tracking (Ctrl+Z / Ctrl+Shift+Z)

- **[DSLEditor.tsx](src/components/DSLEditor.tsx)**: Professional code editor powered by CodeMirror 6 with:
  - **Tab indentation**: Tab/Shift+Tab to indent/unindent single or multiple lines
  - **VSCode Dark Theme**: Familiar professional appearance
  - **Custom syntax highlighting**: Keywords, identifiers, numbers, dimensions, strings, colors, comments
  - **Line numbers**: With active line highlighting
  - **Search**: Built-in Ctrl+F search functionality
  - **Bracket matching**: Auto-closing brackets and matching pairs
  - **Selection highlighting**: Find matching text in document
  - Real-time parsing and error detection
  - Custom language mode: [dsl-language.ts](src/components/dsl-language.ts)

- **[FloorplanRenderer.tsx](src/components/FloorplanRenderer.tsx)**: Interactive SVG rendering engine that:
  - Parses DSL to JSON internally for rendering
  - Calculates dynamic viewBox based on content bounds (includes objects)
  - Renders grid overlay based on `grid_step` with `data-grid-step` attributes
  - Handles composite rooms by drawing all rectangles with borders, then covering shared internal edges
  - Composite rooms highlight all parts together on hover
  - Renders doors (with or without swing arc based on type) and windows
  - Renders room objects (squares and circles) on top of all rooms
  - Click handlers on rooms for selection
  - Hover effects on all elements (rooms, doors, windows, objects)
  - Drag-and-drop room repositioning (when onRoomUpdate callback provided)

### DSL Parser

The DSL parser is built with **PEG.js** (Parser Expression Grammar):

- **Grammar**: [src/floorplan.peggy](src/floorplan.peggy) - PEG grammar definition
- **Generated Parser**: [src/floorplan-parser.js](src/floorplan-parser.js) - Auto-generated, do not edit manually
- **Parser Utils**: [src/dslUtils.ts](src/dslUtils.ts) - `parseDSL()` function and `jsonToDSL()` converter
- **Generation**: Run `npm run peggy:generate` to regenerate parser from grammar

### Composite Rooms

Rooms can have `parts` arrays for complex shapes. Parts use the same positioning system but can reference `"parent"` in their `attachTo` field. The renderer merges these visually by detecting and covering shared edges between adjacent rectangles. **Parts can contain windows, doors, and objects.**

### Type System

All core types are defined in [src/types.ts](src/types.ts):

- `Room`: Requires `id` field (e.g., "livingroom1"). `name` is optional display name. First room is placed at origin; other rooms use `attachTo` to attach to existing rooms. No absolute x/y coordinates supported. Supports optional `parts[]` and `objects[]`. Has `width` (x-axis) and `depth` (y-axis) dimensions.
- `RoomPart`: Nested room parts that can attach to parent or other parts. Requires `id` field, `name` is optional. Can contain windows, doors, and objects.
- `RoomObject`: Decorative objects inside rooms with dual anchor system:
  - `type`: `'square'` or `'circle'`
  - Position relative to room with `x`, `y` offsets from anchors
  - `anchor`: Object's anchor point (top-left, top-right, bottom-left, bottom-right)
  - `roomAnchor`: Which room corner to attach to
  - Dimensions: `width` and `height` for squares, `width` (diameter) for circles
  - Optional `color` and `text` properties
- `Door`: Uses wall-based positioning with room/part ID (`"roomId:wall"`). Doors have a fixed thickness of 100mm.
  - `WallPosition`: `'top'`, `'bottom'`, `'left'`, or `'right'`
  - `SwingDirection`: `'inwards-left'`, `'inwards-right'`, `'outwards-left'`, or `'outwards-right'`
  - `type`: `'normal'` (with swing arc) or `'opening'` (without swing arc)
  - Rotation is calculated automatically based on wall and swing direction
  - Can be placed on room parts
- `Window`: Uses wall-based positioning same as doors (room/part ID based). Windows have a fixed thickness of 100mm. Only requires `offset` parameter for positioning along the wall. Can be placed on room parts.
- `ResolvedRoom`: Room with computed `x` and `y` coordinates

### Coordinate System

All measurements are in **millimeters**. The `mm()` function in [src/utils.ts](src/utils.ts) converts millimeter values to SVG screen coordinates using a fixed display scale (DISPLAY_SCALE = 2, meaning 1mm real world = 0.2px on screen).

### Error Handling

The positioning system returns a `PositioningResult` object containing both the resolved room map and any positioning errors. DSL parsing errors are shown in the ErrorPanel component. Errors are displayed at the bottom of the preview window:

- DSL syntax errors (with line and column information)
- Referenced room doesn't exist in `attachTo`
- Circular dependencies detected in room positioning
- Error panel shows "Syntax Error:" for both DSL and positioning errors

## Deployment

The project is configured to deploy to GitHub Pages at the path `/floorplan/` (see [vite.config.ts:7](vite.config.ts#L7)). Deployment is automated via GitHub Actions workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## DSL Syntax Reference

The DSL (Domain-Specific Language) provides a concise way to define floor plans. Full syntax:

```
grid STEP

room RoomId [LABEL] WxD [SELF_ANCHOR] [at TargetId [TARGET_ANCHOR]] [(OFFSET_X, OFFSET_Y)]
    part PartId [LABEL] WxD [SELF_ANCHOR] at Target [TARGET_ANCHOR] [(OFFSET_X, OFFSET_Y)]
        window W at WALL [(OFFSET)]
        door W [SWING] at WALL [(OFFSET)]
        object TYPE [LABEL] WxD [COLOR] at [ANCHOR] [(OFFSET_X, OFFSET_Y)]
    window W at WALL [(OFFSET)]
    door W [SWING] at WALL [(OFFSET)]
    object TYPE [LABEL] WxD [COLOR] at [ANCHOR] [(OFFSET_X, OFFSET_Y)]
```

**Parameters:**

- `STEP`: Grid step size in millimeters (e.g., `1000`)
- `RoomId/PartId`: Identifier (converted to lowercase internally)
- `LABEL`: Optional string in quotes for rooms and objects only (e.g., `"Living Room"`)
- `WxD`: Width and depth in millimeters (e.g., `5000x4000`)
- `W`: Width/diameter in millimeters (e.g., `1200`)
- `SELF_ANCHOR`: `top-left` | `top-right` | `bottom-left` | `bottom-right` (default: `top-left`)
- `TARGET_ANCHOR`: Same as SELF_ANCHOR (default: `bottom-right` for rooms, `parent` for parts)
- `Target`: Another room/part ID, or `parent` (for parts). Note: `zeropoint` still works for backward compatibility but is not needed - just omit the `at` clause
- `WALL`: `top` | `bottom` | `left` | `right`
- `SWING`: `inwards-left` | `inwards-right` | `outwards-left` | `outwards-right` | `opening` (default: `inwards-left`)
- `TYPE`: `square` | `circle`
- `COLOR`: Hex color code (e.g., `#33d17a`)
- `OFFSET`, `OFFSET_X`, `OFFSET_Y`: Values in millimeters (default: 0)
- `ANCHOR`: Room corner or object anchor point (top-left | top-right | bottom-left | bottom-right)

**Notes:**

- Comments start with `#` (but `#` followed by hex digits is a color code, e.g., `#f5c211`)
- Empty lines are ignored
- Indentation required for nested elements (windows, doors, objects, parts)
- Indentation amount is flexible (any whitespace)
- Tab indentation supported: Tab to indent, Shift+Tab to unindent
- Case-insensitive keywords
- Both `"` and `'` work for labels
- Parts can contain windows, doors, and objects
- Room IDs are converted to lowercase automatically
- For circles, use `width` for diameter (not radius)
- First room without `at` clause is placed at origin; use `at (x, y)` for offset from origin, or `at RoomId:corner` to attach to another room

**Example DSL:**

```dsl
grid 1000

room LivingRoom "Living Room" 5000x4000
    window 1200 at top (300)
    door 900 inwards-right at right (1000)
    object square "Coffee Table" 800x800 #33d17a at bottom-left (1000, 2000)
    object circle "Lamp" 500 #ffd700 at top-right (500, 500)

room Kitchen 4000x3000 at LivingRoom:bottom-right (100, 100)
    window 1000 at left (500)
    door 800 opening at bottom (300)

room Bedroom 5000x4000 at (5000, 0)
    part Closet 2000x1500 at parent:bottom-left
        door 800 inwards-left at right (400)
        object square "Shelf" 500x1200 #9141ac at top-left (100, 100)
```

## Internal JSON Format

While users interact with DSL, the application uses JSON internally for data storage and manipulation. The JSON schema matches the type definitions in [src/types.ts](src/types.ts).

**Note**: Users should work with DSL format (`.floorplan` files), not JSON. JSON is only used internally by the application.

**Example JSON structure:**

```json
{
  "grid_step": 1000,
  "rooms": [
    {
      "id": "livingroom",
      "name": "Living Room",
      "attachTo": "zeropoint:top-left",
      "width": 5000,
      "depth": 4000,
      "objects": [
        {
          "type": "square",
          "x": 1000,
          "y": 2000,
          "width": 800,
          "height": 800,
          "anchor": "bottom-left",
          "roomAnchor": "bottom-left",
          "color": "#33d17a",
          "text": "Coffee Table"
        },
        {
          "type": "circle",
          "x": 500,
          "y": 500,
          "width": 500,
          "anchor": "top-right",
          "roomAnchor": "top-right",
          "color": "#ffd700",
          "text": "Lamp"
        }
      ]
    }
  ],
  "doors": [
    {
      "room": "livingroom:right",
      "offset": 1000,
      "width": 900,
      "swing": "inwards-right",
      "type": "normal"
    }
  ],
  "windows": [
    {
      "room": "livingroom:top",
      "offset": 300,
      "width": 1200
    }
  ]
}
```

## Testing

The project uses **Cucumber/Gherkin** for behavior-driven development (BDD) with **Playwright** for E2E browser automation.

### Test Commands

```bash
# Run all tests (~5 minutes, 145 scenarios)
npm test

# Run tests in headed mode (see browser)
npm run test:headed

# Run a single test by line number
npm run test tests/features/architectural-elements.feature:42

# Run specific feature tests (faster)
npm run test:project-menu      # Project management
npm run test:dsl-editor         # DSL editor
npm run test:room-positioning   # Room positioning
npm run test:architectural      # Doors & windows
npm run test:svg-rendering      # SVG rendering
npm run test:error-handling     # Error handling
```

### Test Suite Status

- **Feature Files:** 6 files in `tests/features/`
- **Step Definitions:** 6 files in `tests/step-definitions/`
- **Test IDs:** Comprehensive `data-testid` attributes throughout components

### Test Coverage

The test suite covers:

1. **Project Menu** ✅ - Project management, save/load, sharing, URL persistence
2. **DSL Editor** ✅ - Text editing, syntax highlighting, parsing, error display, undo/redo
3. **Room Positioning** ✅ - Relative positioning, offsets, first room as anchor
4. **Architectural Elements** ✅ - Doors, windows, wall positioning, parts support
5. **SVG Rendering** ✅ - ViewBox, grid, hover effects, click handlers
6. **Error Handling** ✅ - DSL syntax errors, positioning errors, validation

### Writing Tests - Best Practices

- **Use data-testid attributes** - More reliable than CSS classes or complex selectors
- **Handle timing issues** - Account for debouncing (500ms auto-update, 1s auto-save)
- **Avoid clear() in DSL entry** - Use select-all + fill to avoid empty history entries
- **Test actual behavior** - Test expectations must match actual app behavior
- **Run specific features** - Use individual test commands for faster feedback

## Recent Changes

### DSL-First Architecture (Current Version)

- **DSL Editor is Primary**: DSL is now the source of truth, stored in undo/redo history
- **JSON Editor Removed**: JSON is now an internal format only, not user-facing
- **GUI Editor Removed**: DSL is the only interface for editing floor plans
- **Warnings Fixed**: All ESLint and Prettier warnings resolved
- **Test Warnings Suppressed**: Node.js experimental loader warnings hidden with `--no-warnings`

### DSL Editor Features (CodeMirror 6)

- **Professional Code Editor**: Powered by CodeMirror 6 with VSCode Dark theme
- **Tab Indentation**: Tab/Shift+Tab to indent/unindent single or multiple lines
- **Syntax Highlighting**: Keywords, identifiers, numbers, dimensions, strings, colors, comments
- **Search Functionality**: Built-in Ctrl+F search
- **Bracket Matching**: Auto-closing brackets and pair highlighting
- **Selection Highlighting**: Find matching text in document
- **Error Display**: Line and column information for syntax errors
- **Undo/Redo**: Full history tracking with Ctrl+Z / Ctrl+Shift+Z
- **Parts Support**: Windows, doors, and objects can be added to room parts
- **Flexible Indentation**: Any amount of whitespace for nesting

### Core Features

- **First Room as Anchor**: First room is placed at origin; other rooms attach to it
- **Position Normalization**: Origin is always the top-left-most object
- **No Absolute Coordinates**: All rooms use relative positioning via `attachTo`
- **Room ID System**: Unique IDs required, names are optional display labels
- **Composite Rooms**: Complex shapes via `parts[]` with parent/sibling references
- **Dual Anchor Objects**: Objects have both object anchor and room anchor
- **Door Types**: Normal (with swing arc) or opening (without arc)
- **Error Panel**: Always-visible error display at bottom of preview
- **Project Management**: localStorage-based with URL persistence and sharing
- **Interactive SVG**: Click-to-select, hover effects, drag-and-drop positioning

### Breaking Changes

- Removed JSON editor (DSL is now primary interface)
- Removed GUI editor (DSL is the only interface)
- All rooms require `id` field; first room is anchor, others use `attachTo`
- No support for absolute `x`, `y` coordinates
- `addition` renamed to `parts`
- `height` renamed to `depth` for room dimensions
- Room IDs converted to lowercase automatically
- Position normalization: top-left object is always at origin (0,0)

## Code Quality

- **ESLint**: Zero warnings or errors
- **Prettier**: All files formatted consistently
- **TypeScript**: Strict type checking enabled
- **Build**: Clean build with no warnings
