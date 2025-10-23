# 🏠 Floorplan Designer

A browser-based SVG floorplan designer for creating architectural floor plans through JSON input with real-time visual feedback.

**🌐 Live Demo: [https://torbjokv.github.io/floorplan/](https://torbjokv.github.io/floorplan/)**

![React](https://img.shields.io/badge/React-19.1-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### Core Functionality

- **📝 Dual Editor** - JSON editor or visual GUI editor with form controls
- **🔄 Real-Time Preview** - See changes instantly with automatic rendering (500ms debounce)
- **🏛️ Zero Point System** - Unified positioning with virtual anchor point at (0,0)
- **🎯 Room ID System** - Stable references with unique IDs and optional display names
- **🏗️ Composite Rooms** - Create L-shapes and complex layouts with room parts
- **🎨 Room Objects** - Add decorative objects (squares/circles) with dual anchor system
- **🚪 Doors** - Normal doors with swing arcs or opening-only type without blade
- **🪟 Windows** - Wall-based window positioning with automatic rotation
- **⚠️ Smart Error Handling** - Clear validation messages and Zero Point warnings
- **📐 Dynamic Grid** - Configurable grid overlay for precise measurements
- **📏 Millimeter Precision** - All measurements in millimeters for architectural accuracy

### Interactive Features

- **🖱️ Click-to-Edit** - Click rooms in SVG to jump to their configuration
- **✨ Hover Effects** - Visual feedback on all elements (rooms, doors, windows, objects)
- **🔗 Composite Highlighting** - Hover highlights all parts of composite rooms together

### Project Management

- **💾 Auto-Save** - Projects automatically saved to localStorage
- **🔗 Share URLs** - Share projects with URL including project ID and name
- **🔒 Read-Only Sharing** - Shared projects load as read-only (duplicate to edit)
- **📁 Upload/Download** - Import and export JSON files
- **📋 Duplicate** - Create copies of existing projects
- **↩️ Undo/Redo** - Full history tracking with undo/redo controls

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/floorplan.git

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will open at `http://localhost:5173`

### Building for Production

```bash
# Create optimized production build
npm run build

# Preview the production build locally
npm run preview
```

## 📖 Usage

### Basic Floor Plan with Zero Point

Create a simple floor plan anchored to the Zero Point:

```json
{
  "grid_step": 1000,
  "rooms": [
    {
      "id": "livingroom1",
      "name": "Living Room",
      "attachTo": "zeropoint:top-left",
      "width": 4000,
      "depth": 3000
    },
    {
      "id": "kitchen1",
      "name": "Kitchen",
      "attachTo": "livingroom1:top-right",
      "width": 3000,
      "depth": 3000
    }
  ]
}
```

**Key Points:**

- Rooms need unique `id` (required) and optional `name` (display name)
- First room attaches to `"zeropoint:top-left"` (virtual anchor at 0,0)
- Other rooms can attach to Zero Point or other rooms by ID

### Adding Doors and Windows

```json
{
  "grid_step": 1000,
  "rooms": [...],
  "doors": [
    {
      "room": "livingroom1:bottom",
      "offset": 1000,
      "width": 800,
      "swing": "inwards-right",
      "type": "normal"
    },
    {
      "room": "kitchen1:left",
      "offset": 500,
      "width": 900,
      "type": "opening"
    }
  ],
  "windows": [
    {
      "room": "kitchen1:top",
      "offset": 1000,
      "width": 1200
    }
  ]
}
```

**Door Types:**

- `"normal"` - Shows door rectangle and swing arc (default)
- `"opening"` - Shows only door rectangle (no swing arc)

### Creating Composite Rooms

Build L-shaped or complex room layouts:

```json
{
  "id": "composite1",
  "name": "L-Shaped Room",
  "attachTo": "zeropoint:top-left",
  "width": 3000,
  "depth": 2000,
  "parts": [
    {
      "id": "part1",
      "name": "Extension",
      "width": 1000,
      "depth": 1500,
      "attachTo": "parent:bottom-left"
    }
  ]
}
```

### Adding Room Objects

Add decorative objects like furniture:

```json
{
  "id": "livingroom1",
  "name": "Living Room",
  "attachTo": "zeropoint:top-left",
  "width": 4000,
  "depth": 3000,
  "objects": [
    {
      "type": "square",
      "x": 2000,
      "y": 1500,
      "width": 1000,
      "height": 1000,
      "anchor": "top-left",
      "roomAnchor": "top-left",
      "color": "#4caf50",
      "text": "Table"
    }
  ]
}
```

**Object Anchor System:**

- `anchor` - Where on the object to position (top-left, top-right, bottom-left, bottom-right)
- `roomAnchor` - Which room corner x,y is relative to

## 📚 JSON Schema Reference

### Room Properties

| Property   | Type             | Default      | Description                                                                                                               |
| ---------- | ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `id`       | string           | **required** | Unique room identifier (e.g., "livingroom1")                                                                              |
| `name`     | string           | _optional_   | Display name for the room                                                                                                 |
| `width`    | number           | **required** | Width in millimeters (x-axis)                                                                                             |
| `depth`    | number           | **required** | Depth in millimeters (y-axis)                                                                                             |
| `anchor`   | string           | "top-left"   | Which corner of this room attaches to the reference point: `"top-left"`, `"top-right"`, `"bottom-left"`, `"bottom-right"` |
| `attachTo` | string           | **required** | Reference: `"roomId:corner"` or `"zeropoint:corner"`                                                                      |
| `offset`   | [number, number] | [0, 0]       | Position adjustment `[x, y]`                                                                                              |
| `parts`    | array            | -            | Sub-parts for composite rooms (each needs `id`)                                                                           |
| `objects`  | array            | -            | Decorative objects (squares/circles)                                                                                      |

### Door Properties

Doors have a fixed thickness of 100mm.

| Property | Type   | Default         | Description                                                                          |
| -------- | ------ | --------------- | ------------------------------------------------------------------------------------ |
| `room`   | string | **required**    | Room ID with wall: `"roomId:wall"` where wall is `top`, `bottom`, `left`, or `right` |
| `width`  | number | **required**    | Door width in mm                                                                     |
| `offset` | number | 0               | Distance along the wall from the wall's start in mm                                  |
| `swing`  | string | "inwards-right" | `"inwards-left"`, `"inwards-right"`, `"outwards-left"`, or `"outwards-right"`        |
| `type`   | string | "normal"        | `"normal"` (with swing arc) or `"opening"` (without arc)                             |

### Window Properties

Windows have a fixed thickness of 100mm.

| Property | Type   | Default      | Description                                                                          |
| -------- | ------ | ------------ | ------------------------------------------------------------------------------------ |
| `room`   | string | **required** | Room ID with wall: `"roomId:wall"` where wall is `top`, `bottom`, `left`, or `right` |
| `width`  | number | **required** | Window width in mm                                                                   |
| `offset` | number | 0            | Distance along the wall from the wall's start in mm                                  |

## 🎨 Positioning System

### Zero Point (Recommended)

Anchor the first room to the virtual Zero Point at (0,0):

```json
{
  "id": "livingroom1",
  "name": "Living Room",
  "attachTo": "zeropoint:top-left",
  "width": 4000,
  "depth": 3000
}
```

**Key Feature**: No special "first room" logic - all rooms use the same positioning system!

### Room-to-Room Positioning

Attach rooms to other rooms using their IDs:

```json
{
  "id": "kitchen1",
  "name": "Kitchen",
  "attachTo": "livingroom1:top-right",
  "offset": [0, 0],
  "width": 3000,
  "depth": 3000
}
```

**Anchor Points**: `top-left` (default), `top-right`, `bottom-left`, `bottom-right`

**Offset**: Fine-tune position with `[x, y]` adjustments in millimeters

**Important**: At least one room must connect to Zero Point for a stable floorplan. The system will show an error if no rooms are anchored to Zero Point.

## 🏗️ Architecture

### Project Structure

```
src/
├── components/
│   ├── FloorplanRenderer.tsx  # Interactive SVG rendering engine
│   ├── JSONEditor.tsx          # JSON editor with line numbers and validation
│   └── GUIEditor.tsx           # Visual form-based editor
├── types.ts                    # TypeScript type definitions
├── utils.ts                    # Positioning logic with Zero Point
└── App.tsx                     # Main app with project management
```

### Key Components

- **FloorplanRenderer**: Interactive SVG with click handlers, hover effects, composite highlighting, and drag-and-drop room positioning
- **GUIEditor**: Visual form editor with dropdowns, anchor selectors, object editor, and collapsible sections
- **JSONEditor**: Text editor with line numbers, synchronized scrolling, and error overlay
- **Positioning System**: Zero Point-based positioning with dependency resolution and offset support
- **Project Management**: localStorage with auto-save, sharing, read-only mode for shared projects, and URL-based persistence
- **Undo/Redo System**: Full history tracking with keyboard shortcuts (Ctrl+Z/Ctrl+Shift+Z)

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server with HMR
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Technology Stack

- **React 19** - UI library
- **TypeScript 5.9** - Type safety
- **Vite 7** - Build tool and dev server
- **ESLint** - Code linting
- **SVG** - Vector graphics rendering

### Development Guidelines

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation and development guidance.

## 🐛 Error Handling

### JSON Syntax Errors (❌)

Displayed immediately when JSON is invalid:

```
❌ Unexpected token } in JSON at position 123
```

### Positioning Errors (⚠️)

Displayed when rooms can't be positioned:

```
⚠️ Positioning Errors:
• Room "Kitchen" could not be positioned. Referenced room "Bedroom" not found.
• Room "Hallway" needs either x/y coordinates or both anchor and attachTo properties.
```

**Note**: Positioning errors don't block rendering - successfully positioned rooms will still display.

## 📐 Measurement System

- **Units**: All measurements in millimeters
- **Coordinate System**: Origin (0, 0) at top-left
- **Y-Axis**: Increases downward (standard SVG)
- **Display Scale**: Fixed 2:1 ratio (1mm = 0.2px)

## 🌐 Deployment

The project is configured for GitHub Pages deployment:

```bash
# Deploy is automatic via GitHub Actions on push to main
# Or deploy manually:
npm run build
# Deploy the dist/ folder to your hosting service
```

**Base Path**: Configured for `/floorplan/` in `vite.config.ts`

## 📝 Examples

### Complete Floor Plan

```json
{
  "grid_step": 1000,
  "rooms": [
    {
      "name": "Living Room",
      "width": 5000,
      "depth": 4000
    },
    {
      "name": "Kitchen",
      "attachTo": "Living Room:top-right",
      "width": 3000,
      "depth": 4000
    },
    {
      "name": "Bedroom",
      "attachTo": "Living Room:bottom-left",
      "offset": [0, 500],
      "width": 4000,
      "depth": 3500
    }
  ],
  "doors": [
    {
      "room": "Living Room:bottom",
      "offset": 2000,
      "width": 900,
      "swing": "inwards-right"
    },
    {
      "room": "Bedroom:top",
      "offset": 1000,
      "width": 800,
      "swing": "inwards-left"
    }
  ],
  "windows": [
    {
      "room": "Living Room:top",
      "offset": 1000,
      "width": 1500
    },
    {
      "room": "Kitchen:right",
      "offset": 1000,
      "width": 1200
    }
  ]
}
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow existing code formatting
- Add comments for complex logic
- Update tests if applicable

## 🧪 Testing

The project uses a comprehensive E2E test suite with **Cucumber/Gherkin** and **Playwright**.

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in headed mode (see browser)
npm run test:headed

# Run specific feature tests
npm run test:project-menu      # Project management (12 scenarios) - 100% passing ✅
npm run test:gui-editor         # GUI editor (27 scenarios) - 100% passing ✅
npm run test:json-editor        # JSON editor (8 scenarios) - 100% passing ✅
npm run test:room-positioning   # Room positioning (14 scenarios)
npm run test:architectural      # Doors & windows (13 scenarios)
npm run test:svg-rendering      # SVG rendering (21 scenarios)
npm run test:error-handling     # Error handling (21 scenarios)
```

### Advanced Test Commands

```bash
# Run a specific feature file
npm run test tests/features/project-menu.feature

# Run a specific scenario by line number
npm run test tests/features/gui-editor.feature:42

# Run tests with specific tags
npm run test -- --tags @smoke
npm run test:ci -- --tags "@smoke and not @slow"

# Run in headed mode for any test
npm run test:headed tests/features/error-handling.feature

# CI mode (sets CI=true environment variable)
npm run test:ci
```

All test commands use a centralized runner at `scripts/run-cucumber.js` for consistent configuration.

### Test Statistics

- **Total Scenarios:** 68
- **Current Pass Rate:** 53 scenarios passing (78%)
- **Full Suite Time:** ~90 seconds
- **Individual Features:** 7-50 seconds each

### Documentation

- See [TESTING.md](TESTING.md) for comprehensive testing guide
- See [TEST-STATUS.md](TEST-STATUS.md) for current test status and known issues

### Test Features

The test suite covers:

- ✅ Project management (100% passing)
- ✅ GUI editor operations (100% passing)
- ✅ JSON editor functionality (87% passing)
- Room positioning and Zero Point system
- Door and window placement
- SVG rendering and interactions
- Error handling and validation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔮 Future Enhancements

- [ ] Interactive drag-and-drop positioning
- [ ] Export to PNG/PDF
- [ ] Room rotation support
- [ ] Curved walls and non-rectangular rooms
- [ ] Furniture library
- [ ] Area calculations and measurements
- [ ] Undo/redo functionality
- [ ] Multi-floor support
- [ ] 3D visualization mode
- [ ] Template library

## 📞 Support

- **Documentation**: See [requirements.md](requirements.md) for detailed specifications
- **Architecture Guide**: See [CLAUDE.md](CLAUDE.md) for development guidance
- **Issues**: Report bugs via GitHub Issues

## 🙏 Acknowledgments

- Built with React, TypeScript, and Vite
- Inspired by architectural CAD tools
- SVG rendering for precision and scalability

---

Made with ❤️ for architects, designers, and space planners
