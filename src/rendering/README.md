# Rendering Module

This module provides clean, reusable utilities for rendering and interaction logic. These classes encapsulate complex logic that was previously scattered throughout the FloorplanRenderer component.

## Architecture

### Classes

#### `DragController`

Manages all drag-related state and operations.

**Responsibilities:**

- Track drag state (dragging, start position, offset)
- Calculate snap targets
- Handle corner vs. center dragging
- Calculate final room positions after drag
- Manage connected rooms highlighting

**Key Methods:**

- `startDrag(roomId, room, mouseX, mouseY, dragType, anchor)` - Begin drag operation
- `updateDrag(mouseX, mouseY, room, allRooms, onUpdate)` - Update drag position
- `endDrag(room, resolvedRoom, onUpdate)` - Finish drag and calculate new position
- `clear()` - Reset all drag state

**Usage:**

```typescript
const controller = new DragController();

// Start drag
controller.startDrag('room1', room, mouseX, mouseY, 'corner', 'top-left');

// Update during mouse move
controller.updateDrag(mouseX, mouseY, room, roomMap, (offset, snapTarget) => {
  // Update UI
});

// End drag
controller.endDrag(room, resolvedRoom, updatedRoom => {
  // Save updated room
});
```

#### `CoordinateTransform`

Static utility methods for coordinate transformations and spatial calculations.

**Responsibilities:**

- Convert between screen and millimeter coordinates
- Find closest corners to points
- Check if points are inside rooms
- Calculate corner positions

**Key Methods:**

- `screenToMM(svgRef, screenX, screenY)` - Convert SVG screen coordinates to mm
- `getCornerPosition(room, corner)` - Get absolute position of a corner
- `findClosestCorner(room, x, y)` - Find which corner is closest to a point
- `isInsideRoomCenter(room, x, y)` - Check if point is in room center
- `isPointInRoom(room, x, y, parts)` - Check if point is in room or its parts

**Usage:**

```typescript
// Convert mouse position to mm
const { x, y } = CoordinateTransform.screenToMM(svgRef, event.clientX, event.clientY);

// Find closest corner
const closest = CoordinateTransform.findClosestCorner(room, x, y);
if (closest) {
  console.log(`Closest corner: ${closest.corner}, distance: ${closest.distance}mm`);
}
```

#### `BoundsCalculator`

Calculates bounding boxes for rooms, objects, and the entire floorplan.

**Responsibilities:**

- Calculate overall floorplan bounds
- Include rooms, parts, and objects in bounds
- Calculate grid bounds
- Add appropriate padding

**Key Methods:**

- `calculateBounds(roomMap, compositeRoomPartsMap)` - Calculate overall bounds
- `calculateGridBounds(bounds, gridStep)` - Calculate grid line positions

**Usage:**

```typescript
// Calculate bounds for entire floorplan
const bounds = BoundsCalculator.calculateBounds(roomMap, partsMap);

// Calculate grid bounds
const gridBounds = BoundsCalculator.calculateGridBounds(bounds, 1000);
```

### Hooks

#### `useDragController`

React hook that wraps DragController for easy use in React components.

**Features:**

- Manages DragController lifecycle
- Provides React state for drag operations
- Handles mouse events
- Integrates with room updates

**Usage:**

```typescript
const {
  dragState,
  dragOffset,
  snapTarget,
  hoveredCorner,
  connectedRooms,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
} = useDragController({
  data,
  roomMap,
  compositeRoomPartsMap,
  svgRef,
  onRoomUpdate,
});

// Use in JSX
<svg
  ref={svgRef}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
>
  <rect onMouseDown={(e) => handleMouseDown(e, roomId)} />
</svg>
```

## Design Benefits

### 1. **Separation of Concerns**

- `DragController` - Drag state and logic
- `CoordinateTransform` - Coordinate math
- `BoundsCalculator` - Bounds calculations
- Clear responsibilities for each class

### 2. **Testability**

- Each class can be tested independently
- No React dependencies in core classes
- Pure functions in utilities

### 3. **Reusability**

- Can use DragController in other components
- Coordinate utilities useful throughout app
- Not tied to specific component structure

### 4. **Maintainability**

- Logic is centralized, not scattered
- Clear interfaces
- Easy to understand and modify

### 5. **Performance**

- RequestAnimationFrame for smooth dragging
- Efficient snap target detection
- No unnecessary re-renders

## Migration Guide

To migrate FloorplanRenderer to use these utilities:

1. **Replace bounds calculation:**

   ```typescript
   const bounds = useMemo(
     () => BoundsCalculator.calculateBounds(roomMap, compositeRoomPartsMap),
     [roomMap, compositeRoomPartsMap]
   );
   ```

2. **Replace coordinate transforms:**

   ```typescript
   const screenToMM = (screenX: number, screenY: number) =>
     CoordinateTransform.screenToMM(svgRef.current, screenX, screenY);
   ```

3. **Replace drag logic:**

   ```typescript
   const drag = useDragController({
     data,
     roomMap,
     compositeRoomPartsMap,
     svgRef,
     onRoomUpdate,
   });
   ```

4. **Update event handlers:**
   ```typescript
   onMouseDown={(e) => drag.handleMouseDown(e, roomId)}
   onMouseMove={drag.handleMouseMove}
   onMouseUp={drag.handleMouseUp}
   ```

## Future Enhancements

- Add undo/redo support to DragController
- Implement multi-room selection and drag
- Add rotation support
- Add alignment guides (not just snapping)
- Performance profiling and optimization
- Add drag constraints (e.g., snap to grid)
