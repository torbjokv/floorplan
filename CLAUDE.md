# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based SVG floorplan designer built with React, TypeScript, and Vite. The application uses a **DSL-first approach** where users define floor plans using a custom Domain-Specific Language (DSL), with optional GUI editor and internal JSON representation for data storage.

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

## Architecture

### Core Positioning System

The application uses a **Zero Point positioning system** where all rooms use the same positioning logic:

1. **Zero Point**: Virtual anchor point at (0,0) - `"attachTo": "zeropoint:top-left"`
2. **Room-based positioning**: Attach to other rooms - `"attachTo": "roomId:top-right"`
3. **Offset adjustment**: Fine-tune position with `offset: [x, y]`

**Key Feature**: No special "first room" logic - all rooms treated equally. **All rooms must have `attachTo` property**. At least one room must connect to Zero Point to anchor the floorplan (enforced with error).

This system is implemented in [src/utils.ts](src/utils.ts):

- `resolveRoomPositions()`: Iteratively resolves room positions, handles Zero Point reference
- `resolveCompositeRoom()`: Resolves positions for room parts that can reference parent or other parts
- `getCorner()` and `getAnchorAdjustment()`: Calculate precise corner positions and anchor offsets
- Zero Point validation: Error if no room connects to Zero Point

### Component Architecture

- **[App.tsx](src/App.tsx)**: Main application component with tabbed interface (DSL/GUI editors), project management, and preview. Features:
  - DSL is the primary data format (stored in undo/redo history)
  - 500ms debounced auto-update when DSL text, project ID, or project name changes
  - URL-based persistence (project ID + project name + DSL encoded in hash)
  - localStorage-based project management with auto-save (1s debounce)
  - Dark theme UI
  - Project controls in preview section header
  - Undo/redo functionality with history tracking (Ctrl+Z / Ctrl+Shift+Z)

- **[DSLEditor.tsx](src/components/DSLEditor.tsx)**: Primary text editor for DSL with:
  - Syntax highlighting for keywords, identifiers, numbers, strings, and comments
  - Line numbers display
  - Synchronized scrolling between line numbers, highlighting, and textarea
  - Real-time parsing and error detection
  - Always editable (no read-only mode)

- **[GUIEditor.tsx](src/components/GUIEditor.tsx)**: Visual form-based editor (alternative to DSL) with:
  - Grid settings configuration
  - Room management with visual anchor selectors (Zero Point + other rooms)
  - Automatic room ID generation (e.g., "livingroom1", "kitchen1")
  - Dropdown-based room attachment with corner icons (hidden for Zero Point)
  - Room objects editor with dual anchor points (object anchor + room anchor)
  - Door configuration with type selection (normal with swing arc, or opening without)
  - Window configuration with dropdowns
  - Dark theme UI
  - data-room-id attributes for scroll targeting
  - Changes convert to DSL for storage

- **[FloorplanRenderer.tsx](src/components/FloorplanRenderer.tsx)**: Interactive SVG rendering engine that:
  - Parses DSL to JSON internally for rendering
  - Calculates dynamic viewBox based on content bounds (includes objects)
  - Renders grid overlay based on `grid_step` with `data-grid-step` attributes
  - Handles composite rooms by drawing all rectangles with borders, then covering shared internal edges
  - Composite rooms highlight all parts together on hover
  - Renders doors (with or without swing arc based on type) and windows
  - Renders room objects (squares and circles) on top of all rooms
  - Click handlers on rooms to scroll to their configuration in GUI editor
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

- `Room`: Requires `id` field (e.g., "livingroom1") and `attachTo` field. `name` is optional display name. Must be positioned via Zero Point or other rooms using `attachTo`. No absolute x/y coordinates supported. Supports optional `parts[]` and `objects[]`. Has `width` (x-axis) and `depth` (y-axis) dimensions.
- `RoomPart`: Nested room parts that can attach to parent or other parts. Requires `id` field, `name` is optional. Can contain windows, doors, and objects.
- `RoomObject`: Decorative objects inside rooms with dual anchor system:
  - `type`: `'square'` or `'circle'`
  - Position relative to room with `x`, `y` coordinates
  - `anchor`: Object's anchor point (top-left, top-right, bottom-left, bottom-right)
  - `roomAnchor`: Which room corner to attach to
  - Dimensions: `width`/`height` for squares, `width` (diameter) for circles
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

The positioning system in [src/utils.ts](src/utils.ts) returns a `PositioningResult` object containing both the resolved room map and any positioning errors. DSL parsing errors are shown in the ErrorPanel component. Errors are displayed at the bottom of the preview window:

- DSL syntax errors (with line and column information)
- Referenced room doesn't exist in `attachTo`
- Circular dependencies detected in room positioning
- No room connected to Zero Point (error - enforced)
- Error panel shows "Syntax Error:" for both DSL and positioning errors

## Deployment

The project is configured to deploy to GitHub Pages at the path `/floorplan/` (see [vite.config.ts:7](vite.config.ts#L7)). Deployment is automated via GitHub Actions workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## DSL Syntax Reference

The DSL (Domain-Specific Language) provides a concise way to define floor plans. Full syntax:

```
grid STEP

room RoomId [LABEL] WxD [SELF_ANCHOR] at TargetId [TARGET_ANCHOR] [(OFFSET_X, OFFSET_Y)]
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
- `Target`: `zeropoint`, `parent` (for parts), or another room/part ID
- `WALL`: `top` | `bottom` | `left` | `right`
- `SWING`: `inwards-left` | `inwards-right` | `outwards-left` | `outwards-right` | `opening` (default: `inwards-left`)
- `TYPE`: `square` | `circle`
- `COLOR`: Hex color code (e.g., `#33d17a`)
- `OFFSET`, `OFFSET_X`, `OFFSET_Y`: Values in millimeters (default: 0)
- `ANCHOR`: Room corner or object anchor point (top-left | top-right | bottom-left | bottom-right)

**Notes:**

- Comments start with `#`
- Empty lines are ignored
- Indentation required for nested elements (windows, doors, objects, parts)
- Indentation amount is flexible (any whitespace)
- Case-insensitive keywords
- Both `"` and `'` work for labels
- Parts can contain windows, doors, and objects
- Room IDs are converted to lowercase automatically

**Example DSL:**

```dsl
grid 1000

room LivingRoom "Living Room" 5000x4000 at zeropoint
    window 1200 at top (300)
    door 900 inwards-right at right (1000)
    object square "Coffee Table" 800x800 #33d17a at bottom-left (1000, 2000)

room Kitchen 4000x3000 at LivingRoom:bottom-right (100, 100)
    window 1000 at left (500)
    door 800 opening at bottom (300)

room Bedroom 5000x4000 top-left at zeropoint:top-right
    part Closet 2000x1500 at parent:bottom-left
        door 800 inwards-left at right (400)
        object square "Shelf" 500x1200 #9141ac at top-left (100, 100)
```

## Internal JSON Format

While users interact with DSL, the application uses JSON internally for data storage and manipulation. The JSON schema matches the type definitions in [src/types.ts](src/types.ts).

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

# Run specific feature tests (faster)
npm run test:project-menu      # Project management (11 scenarios)
npm run test:dsl-editor         # DSL editor (33 scenarios) ✅ 100% passing
npm run test:gui-editor         # GUI editor
npm run test:room-positioning   # Room positioning
npm run test:architectural      # Doors & windows
npm run test:svg-rendering      # SVG rendering
npm run test:error-handling     # Error handling
```

### Test Suite Status

- **Total Scenarios:** 145 scenarios
- **Current Pass Rate:** 145 passing (100%) ✅
- **Total Steps:** 959 steps passing
- **Feature Files:** 7 files in `tests/features/`
- **Step Definitions:** 7 files in `tests/step-definitions/`
- **Test IDs:** Comprehensive `data-testid` attributes throughout components

### Test Coverage

The test suite covers:

1. **Project Menu** ✅ - Project management, save/load, sharing, URL persistence
2. **DSL Editor** ✅ - Text editing, syntax highlighting, parsing, error display, undo/redo
3. **GUI Editor** ✅ - Form controls, room/door/window management, DSL sync
4. **Room Positioning** ✅ - Zero Point system, relative positioning, offsets
5. **Architectural Elements** ✅ - Doors, windows, wall positioning, parts support
6. **SVG Rendering** ✅ - ViewBox, grid, hover effects, click handlers
7. **Error Handling** ✅ - DSL syntax errors, positioning errors, validation

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
- **GUI Editor Updates**: GUI changes convert to DSL before storage
- **All Tests Passing**: 145/145 scenarios passing (100% pass rate) ✅
- **Warnings Fixed**: All ESLint and Prettier warnings resolved
- **Test Warnings Suppressed**: Node.js experimental loader warnings hidden with `--no-warnings`

### DSL Features

- **Syntax Highlighting**: Keywords, identifiers, numbers, strings, comments
- **Error Display**: Line and column information for syntax errors
- **Undo/Redo**: Full history tracking with Ctrl+Z / Ctrl+Shift+Z
- **Bidirectional Sync**: DSL ↔ GUI editor synchronization
- **Parts Support**: Windows, doors, and objects can be added to room parts
- **Flexible Indentation**: Any amount of whitespace for nesting

### Core Features

- **Zero Point System**: Virtual anchor at (0,0) for unified positioning
- **No Absolute Coordinates**: All rooms use relative positioning via `attachTo`
- **Room ID System**: Unique IDs required, names are optional display labels
- **Composite Rooms**: Complex shapes via `parts[]` with parent/sibling references
- **Dual Anchor Objects**: Objects have both object anchor and room anchor
- **Door Types**: Normal (with swing arc) or opening (without arc)
- **Error Panel**: Always-visible error display at bottom of preview
- **Project Management**: localStorage-based with URL persistence and sharing
- **Interactive SVG**: Click-to-navigate, hover effects, drag-and-drop positioning

### Breaking Changes

- Removed JSON editor (DSL is now primary interface)
- All rooms require `id` and `attachTo` fields
- No support for absolute `x`, `y` coordinates
- `addition` renamed to `parts`
- `height` renamed to `depth` for room dimensions
- Room IDs converted to lowercase automatically

## Code Quality

- **ESLint**: Zero warnings or errors
- **Prettier**: All files formatted consistently
- **TypeScript**: Strict type checking enabled
- **Tests**: 100% scenario pass rate (145/145)
- **Build**: Clean build with no warnings
