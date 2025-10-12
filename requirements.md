# Floorplan Designer - Requirements Specification

## Overview

A browser-based SVG floorplan designer that enables users to create architectural floor plans through JSON input. The application provides real-time visual feedback with automatic layout resolution and comprehensive error reporting.

## Project Information

- **Tech Stack**: React 19, TypeScript 5.9, Vite 7
- **Rendering**: SVG-based with dynamic viewBox calculation
- **Coordinate System**: All measurements in millimeters
- **Display Scale**: Fixed 2:1 ratio (1mm real world = 0.2px on screen)

---

## Terminology Note

**Important**: The term `depth` refers to the y-axis dimension of a room on the floor plan (replaces the old term "height"). Doors and windows have a fixed thickness of 100mm for rendering purposes and do not require a depth property.

---

## Core Features

### 1. Dual-Pane Interface

**Left Pane: JSON Editor**
- Syntax-highlighted text editor with line numbers
- Real-time JSON validation
- 500ms debounced auto-update
- Error and warning display:
  - JSON syntax errors (displayed with ❌)
  - Positioning validation warnings (displayed with ⚠️)
- Manual render button for explicit updates

**Right Pane: SVG Preview**
- Live-rendered floor plan
- Dynamic grid overlay (configurable step size)
- Automatic bounds calculation with 10% padding
- Centered room labels
- Visual update indicator

### 2. Room Definition System

#### Positioning Methods

Rooms can be positioned using two approaches:

**Absolute Positioning**
```json
{
  "name": "Living Room",
  "width": 4000,
  "depth": 3000
}
```

Note: `x` and `y` default to `0` when not specified.

**Relative Positioning**
```json
{
  "name": "Kitchen",
  "attachTo": "Living Room:top-right",
  "offset": [500, 0],
  "width": 4000,
  "depth": 3000
}
```

Note: `anchor` defaults to `"top-left"` when not specified.

#### Room Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `name` | string | ✓ | - | Unique identifier for the room |
| `width` | number | ✓ | - | Room width in mm (x-axis) |
| `depth` | number | ✓ | - | Room depth in mm (y-axis) |
| `x` | number | - | 0 | Absolute x-coordinate |
| `y` | number | - | 0 | Absolute y-coordinate |
| `anchor` | Anchor | - | "top-left" | Corner to use for attachment: `"top-right"`, `"bottom-left"`, `"bottom-right"` |
| `attachTo` | string | - | - | Reference point: `"RoomName:corner"` (takes priority over x/y if specified) |
| `offset` | [number, number] | - | [0, 0] | Position adjustment `[x, y]` in mm |
| `addition` | RoomAddition[] | - | - | Array of sub-parts for composite rooms |

**Note**: If `attachTo` is specified, it takes priority over `x` and `y` coordinates.

### 3. Composite Rooms

Rooms can be composed of multiple rectangular sections using the `addition` array. Each addition follows the same positioning rules and can reference:
- The parent room using `"parent:corner"`
- Other additions by name

**Visual Rendering**: The system automatically detects and removes internal borders between adjacent sections, creating a seamless appearance.

**Example**:
```json
{
  "name": "L-Shaped Room",
  "width": 3000,
  "depth": 2000,
  "addition": [
    {
      "name": "extension",
      "width": 1000,
      "depth": 1500,
      "attachTo": "parent:bottom-left"
    }
  ]
}
```

Note: The main room uses default `x: 0, y: 0`, and the extension uses default `anchor: "top-left"`.

### 4. Doors

Doors are rendered with a swing arc showing the opening direction. Doors have a fixed thickness of 100mm.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `room` | string | ✓ | - | Room reference with anchor: `"RoomName:corner"` |
| `width` | number | ✓ | - | Door width in mm |
| `offset` | [number, number] | - | [0, 0] | Position offset from anchor |
| `rotation` | number | - | 0 | Rotation angle in degrees |
| `swing` | "left" \| "right" | - | "right" | Direction of door swing |

**Example**:
```json
{
  "room": "Living Room:bottom-left",
  "offset": [1000, 0],
  "width": 800,
  "rotation": 0,
  "swing": "right"
}
```

### 5. Windows

Windows are rendered as simple rectangular elements. Windows have a fixed thickness of 100mm.

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `room` | string | ✓ | - | Room reference with anchor: `"RoomName:corner"` |
| `width` | number | ✓ | - | Window width in mm |
| `offset` | [number, number] | - | [0, 0] | Position offset from anchor |
| `rotation` | number | - | 0 | Rotation angle in degrees |

**Example**:
```json
{
  "room": "Kitchen:top-right",
  "offset": [-1000, 0],
  "width": 800,
  "rotation": 0
}
```

---

## JSON Schema

### Root Object

```json
{
  "grid_step": 1000,
  "rooms": [...],
  "doors": [...],
  "windows": [...]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `grid_step` | number | ✓ | Grid spacing in millimeters |
| `rooms` | Room[] | ✓ | Array of room definitions |
| `doors` | Door[] | - | Array of door definitions |
| `windows` | Window[] | - | Array of window definitions |

### Complete Example

```json
{
  "grid_step": 1000,
  "rooms": [
    {
      "name": "Living Room",
      "width": 4000,
      "depth": 3000
    },
    {
      "name": "Kitchen",
      "attachTo": "Living Room:top-right",
      "offset": [500, 0],
      "width": 4000,
      "depth": 3000
    },
    {
      "name": "L-Shaped Hallway",
      "width": 2000,
      "depth": 1000,
      "attachTo": "Living Room:bottom-left",
      "offset": [0, 500],
      "addition": [
        {
          "name": "hallway_extension",
          "width": 1000,
          "depth": 2000,
          "attachTo": "parent:bottom-left",
          "offset": [0, 0]
        }
      ]
    }
  ],
  "doors": [
    {
      "room": "Living Room:bottom-left",
      "offset": [1000, 0],
      "width": 800,
      "rotation": 0,
      "swing": "right"
    }
  ],
  "windows": [
    {
      "room": "Kitchen:top-right",
      "offset": [-1000, 0],
      "width": 800,
      "rotation": 0
    }
  ]
}
```

---

## Error Handling & Validation

### JSON Syntax Errors
- Displayed immediately in the editor with ❌ icon
- Prevents rendering until resolved
- Shows standard JSON parsing error messages

### Positioning Errors
- Displayed in the editor with ⚠️ icon when JSON is valid
- Does not block rendering (renders successfully positioned rooms)
- Common scenarios:
  - **Missing Properties**: Room lacks both absolute coordinates and relative positioning
  - **Invalid References**: `attachTo` references a non-existent room
  - **Circular Dependencies**: Room A references Room B which references Room A
  - **Invalid Anchor Syntax**: Malformed anchor reference

### Dependency Resolution
- Iterative algorithm resolves room positions
- Maximum 20 iterations to prevent infinite loops
- Unresolved rooms are reported as errors with specific details

---

## Functional Requirements

### FR-1: JSON Input Validation
- Real-time syntax validation with 500ms debounce
- Schema validation for required properties
- User-friendly error messages

### FR-2: Positioning System
- Support for absolute (x, y) positioning
- Support for relative (anchor + attachTo) positioning
- Automatic dependency resolution
- Handle circular dependency detection

### FR-3: Composite Room Rendering
- Support for multi-part room definitions
- Automatic edge detection and border merging
- Recursive positioning for nested additions

### FR-4: Architectural Elements
- Door rendering with swing arcs
- Window rendering as wall openings
- Support for rotation and custom wall thickness

### FR-5: Visual Feedback
- Dynamic grid overlay
- Automatic viewport calculation
- Room labels centered within shapes
- Update animations for user feedback

---

## Non-Functional Requirements

### NFR-1: Performance
- Render updates within 100ms for typical floor plans
- Support for at least 50 rooms without degradation
- Debounced input to prevent excessive re-renders

### NFR-2: Usability
- Clear error messages with actionable guidance
- Visual distinction between errors and warnings
- Responsive layout for different screen sizes

### NFR-3: Maintainability
- Type-safe TypeScript implementation
- Modular component architecture
- Comprehensive inline documentation

### NFR-4: Browser Compatibility
- Modern browsers with ES2020+ support
- SVG 1.1 rendering capabilities
- No external runtime dependencies

---

## Future Enhancements (Out of Scope)

- Interactive drag-and-drop room positioning
- Export to PNG/PDF formats
- Room rotation support
- Curved walls and non-rectangular rooms
- Furniture and fixture libraries
- Measurement tools and area calculations
- Undo/redo functionality
- Multi-floor support
- Import from CAD formats
- 3D visualization mode
- Collaborative editing
- Template library

---

## Technical Constraints

1. All measurements must be in millimeters
2. Coordinate system origin (0, 0) is top-left
3. Y-axis increases downward (standard SVG coordinate system)
4. Room names must be unique within a floor plan
5. Circular dependencies are not allowed in positioning
6. Maximum 20 iterations for dependency resolution

---

## Acceptance Criteria

### AC-1: Room Positioning
- ✓ Rooms can be positioned absolutely using x, y coordinates
- ✓ Rooms can be positioned relatively using anchor + attachTo
- ✓ System resolves room dependencies automatically
- ✓ System detects and reports circular dependencies

### AC-2: Error Reporting
- ✓ JSON syntax errors are displayed in the editor
- ✓ Positioning errors are displayed as warnings
- ✓ Error messages are clear and actionable
- ✓ Successfully positioned rooms render even with some errors

### AC-3: Visual Rendering
- ✓ Rooms render as rectangles with borders
- ✓ Composite rooms appear as unified shapes
- ✓ Doors show swing arcs
- ✓ Windows render on walls
- ✓ Grid overlay is visible and configurable

### AC-4: User Experience
- ✓ Changes update automatically (debounced)
- ✓ Manual render button available
- ✓ Visual feedback on updates
- ✓ Line numbers in editor
- ✓ Scrolling synchronized between line numbers and editor

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025 | Renamed `height` to `depth`, removed `scale` property, added positioning error display |
| 1.0 | 2025 | Initial requirements specification |
