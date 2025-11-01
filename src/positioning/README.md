# Positioning Module

This module encapsulates all room and part positioning logic in a clean, object-oriented design.

## Architecture

### Classes

#### `PartRegistry`

Manages part tracking and parent-child relationships.

**Responsibilities:**

- Track which IDs are parts vs. top-level rooms
- Map parts to their parent rooms
- Provide helper methods for drag detection

**Key Methods:**

- `registerPart(partId, parentRoomId)` - Register a part with its parent
- `isPart(id)` - Check if an ID is a part
- `getParentId(partId)` - Get parent room ID for a part
- `isRoomOrParentDragging(roomId, draggedRoomId)` - Check drag relationships

#### `PositionCalculator`

Static utility methods for coordinate calculations.

**Responsibilities:**

- Calculate corner positions
- Calculate anchor adjustments
- Calculate absolute positions from relative attachments

**Key Methods:**

- `getCorner(room, corner)` - Get corner coordinates
- `getAnchorAdjustment(anchor, width, depth)` - Get anchor offset
- `calculatePosition(anchorPoint, anchor, width, depth, offset)` - Calculate absolute position

#### `RoomPositionResolver`

Main positioning algorithm that resolves room and part positions.

**Responsibilities:**

- Iteratively resolve room positions based on attachTo references
- Handle zeropoint and room-to-room attachments
- Resolve composite room parts
- Track positioning errors

**Key Methods:**

- `resolve(rooms)` - Main entry point, returns `PositioningResult`

## Design Benefits

### 1. **Separation of Concerns**

- `PartRegistry` - Part tracking (data)
- `PositionCalculator` - Coordinate math (pure functions)
- `RoomPositionResolver` - Positioning algorithm (logic)

### 2. **Encapsulation**

- Part logic is contained in PartRegistry
- No exposed Sets/Maps in the public API
- Clear boundaries between components

### 3. **Testability**

- Each class can be tested independently
- Pure functions in PositionCalculator are easy to test
- Mock-friendly interfaces

### 4. **Backwards Compatibility**

- Old `utils.ts` functions still work
- Gradual migration path
- No breaking changes for existing code

### 5. **Type Safety**

- Strong typing throughout
- Clear interfaces for results
- No implicit type casts

## Usage

### Basic Usage

```typescript
import { RoomPositionResolver } from './positioning';

const resolver = new RoomPositionResolver();
const result = resolver.resolve(rooms);

// Access resolved rooms
const roomMap = result.roomMap;

// Check if something is a part
if (result.partRegistry.isPart('part1')) {
  const parentId = result.partRegistry.getParentId('part1');
}
```

### Legacy Usage (Backwards Compatible)

```typescript
import { resolveRoomPositions } from './utils';

const { roomMap, errors, partIds, partToParent } = resolveRoomPositions(rooms);
```

## Future Improvements

- Add validation at the resolver level
- Implement dependency graph visualization
- Add performance metrics/profiling
- Create specialized resolvers for different scenarios
- Add caching for frequently accessed computations
