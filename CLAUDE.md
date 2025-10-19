# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based SVG floorplan designer built with React, TypeScript, and Vite. The application allows users to define floor plans using JSON input and renders them as interactive SVG visualizations.

## Development Commands

- `npm run dev` - Start Vite development server with HMR
- `npm run build` - Type-check with TypeScript and build for production
- `npm run lint` - Run ESLint on the codebase
- `npm run preview` - Preview the production build locally

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
- Zero Point validation: Warns if no room connects to Zero Point

### Component Architecture

- **[App.tsx](src/App.tsx)**: Main application component with tabbed interface (JSON/GUI editors), project management, and preview. Features:
  - 500ms debounced auto-update when JSON changes
  - URL-based persistence (project ID + JSON encoded in hash)
  - localStorage-based project management with auto-save (disabled for shared projects)
  - Read-only mode for projects loaded from shared URLs (must duplicate to edit)
  - Dark theme UI
  - Project controls in preview section header
- **[JSONEditor.tsx](src/components/JSONEditor.tsx)**: Text editor with line numbers, synchronized scrolling, and error overlay display.
- **[GUIEditor.tsx](src/components/GUIEditor.tsx)**: Visual form-based editor with:
  - Grid settings configuration
  - Room management with visual anchor selectors (Zero Point + other rooms)
  - Automatic room ID generation (e.g., "livingroom1", "kitchen1")
  - Dropdown-based room attachment with corner icons (hidden for Zero Point)
  - Collapsible x/y coordinate fields
  - Room objects editor with dual anchor points (object anchor + room anchor)
  - Door configuration with type selection (normal with swing arc, or opening without)
  - Window configuration with dropdowns
  - Dark theme UI
  - data-room-id attributes for scroll targeting
- **[FloorplanRenderer.tsx](src/components/FloorplanRenderer.tsx)**: Interactive SVG rendering engine that:
  - Calculates dynamic viewBox based on content bounds (includes objects)
  - Renders grid overlay based on `grid_step`
  - Handles composite rooms by drawing all rectangles with borders, then covering shared internal edges
  - Composite rooms highlight all parts together on hover
  - Renders doors (with or without swing arc based on type) and windows
  - Renders room objects (squares and circles) on top of all rooms
  - Click handlers on rooms to scroll to their configuration in GUI editor
  - Hover effects on all elements (rooms, doors, windows, objects)

### Composite Rooms

Rooms can have `parts` arrays for complex shapes. Parts use the same positioning system but can reference `"parent"` in their `attachTo` field. The renderer merges these visually by detecting and covering shared edges between adjacent rectangles.

### Type System

All core types are defined in [src/types.ts](src/types.ts):
- `Room`: **BREAKING**: Now requires `id` field (e.g., "livingroom1") and `attachTo` field. `name` is optional display name. Must be positioned via Zero Point or other rooms using `attachTo`. No longer supports absolute x/y coordinates. Supports optional `parts[]` and `objects[]`. Has `width` (x-axis) and `depth` (y-axis) dimensions.
- `RoomPart`: Nested room parts that can attach to parent or other parts. **BREAKING**: Now requires `id` field, `name` is optional.
- `RoomObject`: Decorative objects inside rooms with dual anchor system:
  - `type`: `'square'` or `'circle'`
  - Position relative to room with `x`, `y` coordinates
  - `anchor`: Object's anchor point (top-left, top-right, bottom-left, bottom-right)
  - `roomAnchor`: Which room corner to attach to
  - Dimensions: `width`/`height` for squares, `radius` for circles
  - Optional `color` and `text` properties
- `Door`: Uses wall-based positioning with room ID (`"roomId:wall"`). Doors have a fixed thickness of 100mm.
  - `WallPosition`: `'top'`, `'bottom'`, `'left'`, or `'right'`
  - `SwingDirection`: `'inwards-left'`, `'inwards-right'`, `'outwards-left'`, or `'outwards-right'`
  - `type`: `'normal'` (with swing arc) or `'opening'` (without swing arc)
  - Rotation is calculated automatically based on wall and swing direction
- `Window`: Uses wall-based positioning same as doors (room ID based). Windows have a fixed thickness of 100mm. Only requires `offset` parameter for positioning along the wall.
- `ResolvedRoom`: Room with computed `x` and `y` coordinates

### Coordinate System

All measurements are in **millimeters**. The `mm()` function in [src/utils.ts](src/utils.ts) converts millimeter values to SVG screen coordinates using a fixed display scale (DISPLAY_SCALE = 2, meaning 1mm real world = 0.2px on screen).

### Error Handling

The positioning system in [src/utils.ts](src/utils.ts) returns a `PositioningResult` object containing both the resolved room map and any positioning errors. Errors and warnings are displayed at the bottom of the preview window when:
- A referenced room doesn't exist in `attachTo`
- Circular dependencies are detected in room positioning
- No room is connected to Zero Point (error - enforced)

## Deployment

The project is configured to deploy to GitHub Pages at the path `/floorplan/` (see [vite.config.ts:7](vite.config.ts#L7)). Deployment is automated via GitHub Actions workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## JSON Schema

Example floorplan structure with Zero Point and all features:
```json
{
  "grid_step": 1000,
  "rooms": [{
    "id": "livingroom1",
    "name": "Living Room",
    "attachTo": "zeropoint:top-left",
    "width": 4000,
    "depth": 3000,
    "objects": [{
      "type": "square",
      "x": 2000,
      "y": 1500,
      "width": 1000,
      "height": 1000,
      "anchor": "top-left",
      "roomAnchor": "top-left",
      "color": "#4caf50",
      "text": "Table"
    }]
  }, {
    "id": "kitchen1",
    "name": "Kitchen",
    "anchor": "top-left",
    "attachTo": "livingroom1:top-right",
    "offset": [0, 0],
    "width": 4000,
    "depth": 3000
  }, {
    "id": "composite1",
    "name": "Composite Room",
    "width": 3000,
    "depth": 2000,
    "attachTo": "livingroom1:bottom-left",
    "parts": [{
      "id": "part1",
      "name": "Extension",
      "width": 1000,
      "depth": 1000,
      "attachTo": "parent:bottom-left"
    }]
  }],
  "doors": [{
    "room": "livingroom1:bottom",
    "offset": 1000,
    "width": 800,
    "swing": "inwards-right",
    "type": "normal"
  }, {
    "room": "kitchen1:left",
    "offset": 1000,
    "width": 900,
    "type": "opening"
  }],
  "windows": [{
    "room": "kitchen1:top",
    "offset": 1000,
    "width": 1200
  }]
}
```

## Recent Changes

### Latest Updates (Current Session)
- **Zero Point System** ⚫ (BREAKING CHANGE): Virtual anchor point at (0,0) for unified positioning
  - Renamed from "Foundation Stone" to "Zero Point" everywhere
  - No more "first room" special logic - all rooms use same positioning system
  - Rooms can attach to "zeropoint:top-left" (or any corner)
  - Corner selector hidden when Zero Point is selected
  - Validation error (not warning) if no room connects to Zero Point
- **Removed Absolute Positioning** (BREAKING CHANGE): Rooms no longer support `x` and `y` coordinates
  - All rooms must use `attachTo` (required field)
  - Use `offset: [x, y]` for fine-tuning position from attachment point
  - GUI editor shows offset fields instead of x/y coordinates
- **Error Panel**: Errors now display at bottom of preview window (always visible)
  - Shows both JSON errors and positioning errors
  - Different colors for errors vs warnings
  - Visible in both JSON and GUI editor modes
- **Room ID System** (BREAKING CHANGE): Rooms and parts now require unique `id` field
  - `name` is optional display name
  - All references use IDs instead of names (doors, windows, attachTo)
  - Auto-generation of IDs in GUI editor (e.g., "livingroom1", "kitchen1")
- **Project Management Improvements**:
  - Shared projects are read-only (must duplicate to edit)
  - Project ID in URL for better tracking
  - Upload, Duplicate, Download, Share buttons in Projects menu
  - Projects menu moved to preview section header with Manual link
- **Interactive Features**:
  - Click rooms in SVG to scroll to their configuration in GUI editor
  - Composite rooms highlight all parts together on hover
  - Hover effects on all SVG elements (rooms, doors, windows, objects)
- **Door Types**: New `type` property - "normal" (with swing arc) or "opening" (without arc)
- **Dual Anchor System for Objects**: Objects have both `anchor` (object position) and `roomAnchor` (which room corner to attach to)

### Previous Updates
- **Renamed `addition` to `parts`**: Room extensions now use `parts[]` instead of `addition[]` (BREAKING CHANGE)
- **Added room objects**: Rooms can contain decorative objects (squares/circles) with customizable colors
- **Wall-based door/window positioning**: Uses wall positions (`top`, `bottom`, `left`, `right`) with automatic rotation (BREAKING CHANGE)
- **Renamed `height` to `depth`**: Room dimensions use `depth` for y-axis (BREAKING CHANGE)
- **GUI Editor**: Visual form-based editor with dropdowns, anchor selectors, object editor
- **Project Management**: localStorage-based save/load system
- **Dark Theme**: Consistent dark UI throughout application
