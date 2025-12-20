# 🏠 Floorplan Designer

A browser-based SVG floorplan designer for creating architectural floor plans through a custom DSL (Domain-Specific Language) with real-time visual feedback.

**🌐 Live Demo: [https://torbjokv.github.io/floorplan/](https://torbjokv.github.io/floorplan/)**

![React](https://img.shields.io/badge/React-19.1-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### Core Functionality

- **📝 DSL Editor** - Concise domain-specific language with syntax highlighting
- **🔄 Real-Time Preview** - See changes instantly with automatic rendering (500ms debounce)
- **🏛️ Zero Point System** - Unified positioning with virtual anchor point at (0,0)
- **🎯 Room ID System** - Stable references with unique IDs and optional display names
- **🏗️ Composite Rooms** - Create L-shapes and complex layouts with room parts
- **🎨 Room Objects** - Add decorative objects (squares/circles) with dual anchor system
- **🚪 Doors** - Normal doors with swing arcs or opening-only type without blade
- **🪟 Windows** - Wall-based window positioning with automatic rotation
- **⚠️ Smart Error Handling** - Clear validation messages with line/column information
- **📐 Dynamic Grid** - Configurable grid overlay for precise measurements
- **📏 Millimeter Precision** - All measurements in millimeters for architectural accuracy

### Interactive Features

- **🖱️ Click-to-Select** - Click rooms in SVG to select them for editing
- **✨ Hover Effects** - Visual feedback on all elements (rooms, doors, windows, objects)
- **🔗 Composite Highlighting** - Hover highlights all parts of composite rooms together
- **↩️ Undo/Redo** - Full history tracking with keyboard shortcuts (Ctrl+Z/Ctrl+Shift+Z)

### Project Management

- **💾 Auto-Save** - Projects automatically saved to localStorage (1s debounce)
- **🔗 Share URLs** - Share projects with URL including project ID and name
- **📁 Upload/Download** - Import and export DSL files
- **📋 Duplicate** - Create copies of existing projects

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

### DSL Syntax (Primary Interface)

Create floor plans using the concise DSL syntax:

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

**DSL Editor Features (CodeMirror 6):**

- **Professional Code Editor** - Powered by CodeMirror 6 with VSCode Dark theme
- **Tab Indentation** - Tab/Shift+Tab to indent/unindent single or multiple lines
- **Syntax Highlighting** - Keywords, identifiers, numbers, dimensions, strings, colors, comments
- **Search** - Built-in Ctrl+F search functionality
- **Bracket Matching** - Auto-closing brackets and pair highlighting
- **Selection Highlighting** - Find matching text in document
- **Flexible Indentation** - Any amount of whitespace for nested elements
- **Case-Insensitive Keywords** - `room`, `ROOM`, `Room` all work
- **Comments** - Lines starting with `#` (but `#` + hex digits = color code)
- **Error Display** - Line and column information for syntax errors
- **Auto-Completion** - Works seamlessly with GUI editor

### DSL Syntax Reference

**Grid Setting:**

```
grid STEP
```

**Room Definition:**

```
room RoomId [LABEL] WxD [SELF_ANCHOR] at TargetId [TARGET_ANCHOR] [(OFFSET_X, OFFSET_Y)]
```

**Part Definition (inside room):**

```
    part PartId [LABEL] WxD [SELF_ANCHOR] at Target [TARGET_ANCHOR] [(OFFSET_X, OFFSET_Y)]
```

**Window (inside room or part):**

```
    window W at WALL [(OFFSET)]
```

**Door (inside room or part):**

```
    door W [SWING] at WALL [(OFFSET)]
```

**Object (inside room or part):**

```
    object TYPE [LABEL] WxD [COLOR] at [ANCHOR] [(OFFSET_X, OFFSET_Y)]
```

**Parameters:**

- `STEP`: Grid step in millimeters (e.g., `1000`)
- `RoomId/PartId`: Identifier (converted to lowercase)
- `LABEL`: Optional string in quotes (e.g., `"Living Room"`)
- `WxD`: Width x Depth in mm (e.g., `5000x4000`)
- `W`: Width in mm (e.g., `1200`)
- `SELF_ANCHOR`: `top-left` | `top-right` | `bottom-left` | `bottom-right` (default: `top-left`)
- `TARGET_ANCHOR`: Same as SELF_ANCHOR (default: `bottom-right`)
- `Target`: `zeropoint`, `parent`, or room/part ID
- `WALL`: `top` | `bottom` | `left` | `right`
- `SWING`: `inwards-left` | `inwards-right` | `outwards-left` | `outwards-right` | `opening`
- `TYPE`: `square` | `circle`
- `COLOR`: Hex color (e.g., `#33d17a`)
- `OFFSET`, `OFFSET_X`, `OFFSET_Y`: Values in mm (default: 0)
- `ANCHOR`: Corner point for objects

### Zero Point System

All floor plans anchor to a virtual Zero Point at (0,0):

```dsl
room LivingRoom 4000x3000 at zeropoint
room Kitchen 3000x3000 at LivingRoom:top-right
```

**Key Benefits:**

- No special "first room" logic
- All rooms use same positioning system
- At least one room must connect to Zero Point (enforced)
- Rooms can reference Zero Point or other rooms

### Composite Rooms

Create L-shaped or complex layouts:

```dsl
room MainArea 6000x5000 at zeropoint
    part Extension 2000x3000 at parent:bottom-right
        window 1200 at top (500)
        door 900 at left (800)
```

Parts can contain windows, doors, and objects just like rooms!

### Room Objects

Add decorative elements with dual anchor system:

```dsl
object square "Dining Table" 1600x900 #8b5a3c at top-left (1000, 1500)
object circle "Lamp" 500 #ffd700 at top-right (500, 500)
```

**Object Features:**

- **Square objects**: Specify `width x height` (e.g., `1600x900`)
- **Circle objects**: Specify `width` (diameter, not radius) (e.g., `500`)
- **Dual Anchor System**: Objects positioned relative to room corners
- **Colors**: Hex color codes (e.g., `#ffd700`)
- **Labels**: Optional text labels in quotes

## 🎨 Positioning System

### Zero Point (Required)

At least one room must attach to the virtual Zero Point:

```dsl
room LivingRoom 5000x4000 at zeropoint
```

### Room-to-Room Positioning

Attach rooms to other rooms:

```dsl
room Kitchen 4000x3000 at LivingRoom:top-right
room Bedroom 4000x3500 at LivingRoom:bottom-left (0, 500)
```

**Anchor Points:** `top-left`, `top-right`, `bottom-left`, `bottom-right`

**Offsets:** Fine-tune position with `(x, y)` adjustments in millimeters

## 🏗️ Architecture

### Project Structure

```
src/
├── components/
│   ├── FloorplanRenderer.tsx  # Interactive SVG rendering engine
│   ├── DSLEditor.tsx           # CodeMirror 6 DSL editor
│   ├── dsl-language.ts         # Custom CodeMirror language mode
│   └── floorplan/              # Rendering components
├── positioning/                # Positioning system modules
│   ├── PartRegistry.ts         # Part tracking
│   ├── PositionCalculator.ts   # Coordinate calculations
│   └── RoomPositionResolver.ts # Position resolution logic
├── rendering/                  # Rendering utilities
│   ├── CoordinateTransform.ts  # Coordinate transformations
│   ├── DragController.ts       # Drag-and-drop logic
│   └── BoundsCalculator.ts     # Bounds calculations
├── floorplan.peggy             # PEG grammar for DSL parser
├── dslUtils.ts                 # DSL parsing and JSON conversion
├── types.ts                    # TypeScript type definitions
├── utils.ts                    # Core utilities
└── App.tsx                     # Main app with project management
```

### Key Components

- **DSL Editor** (CodeMirror 6): Professional code editor with VSCode Dark theme, tab indentation, search, syntax highlighting
- **FloorplanRenderer**: Interactive SVG with click handlers, hover effects, composite highlighting, drag-and-drop
- **PEG Parser**: Grammar-based DSL parser (generated from floorplan.peggy)
- **Positioning System**: Zero Point-based positioning with dependency resolution
- **Project Management**: localStorage with auto-save, sharing, URL-based persistence, `.floorplan` file format
- **Undo/Redo System**: Full history tracking with keyboard shortcuts

## 🛠️ Development

### Available Scripts

```bash
npm run dev           # Start development server with HMR
npm run build         # Full build pipeline (peggy, lint, format, build)
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
npm run peggy:generate # Generate parser from grammar
npm run preview       # Preview production build
npm test              # Run all tests (~5 minutes, 145 scenarios)
npm run test:headed   # Run tests in headed mode
```

### Technology Stack

- **React 19** - UI library
- **TypeScript 5.9** - Type safety
- **Vite 7** - Build tool and dev server
- **CodeMirror 6** - Professional code editor component
- **PEG.js** - Parser Expression Grammar for DSL
- **Playwright** - E2E testing
- **Cucumber** - BDD test framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **SVG** - Vector graphics rendering

### Development Guidelines

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation and development guidance.

## 🐛 Error Handling

### DSL Syntax Errors

Displayed with line and column information:

```
Syntax Error: Expected identifier but "}" found. (Line 5, Column 12)
```

### Positioning Errors

Displayed when rooms can't be positioned:

```
⚠️ Positioning Errors:
• Room "kitchen" could not be positioned. Referenced room "bedroom" not found.
• No room is connected to Zero Point - floor plan needs an anchor point
```

**Note**: Positioning errors don't block rendering - successfully positioned rooms will still display.

## 📐 Measurement System

- **Units**: All measurements in millimeters
- **Coordinate System**: Origin (0, 0) at top-left
- **Y-Axis**: Increases downward (standard SVG)
- **Display Scale**: Fixed 2:1 ratio (1mm = 0.2px)
- **Doors/Windows**: Fixed 100mm thickness

## 🌐 Deployment

The project is configured for GitHub Pages deployment:

```bash
# Deploy is automatic via GitHub Actions on push to main
# Or deploy manually:
npm run build
# Deploy the dist/ folder to your hosting service
```

**Base Path**: Configured for `/floorplan/` in `vite.config.ts`

## 🧪 Testing

The project uses a comprehensive E2E test suite with **Cucumber/Gherkin** and **Playwright**.

### Running Tests

```bash
# Run all tests (~5 minutes, 145 scenarios)
npm test

# Run tests in headed mode (see browser)
npm run test:headed

# Run specific feature tests
npm run test:project-menu      # Project management
npm run test:dsl-editor         # DSL editor
npm run test:room-positioning   # Room positioning
npm run test:architectural      # Doors & windows
npm run test:svg-rendering      # SVG rendering
npm run test:error-handling     # Error handling
```

### Test Statistics

- **Feature Files:** 6 files
- **No Warnings:** Clean test output with suppressed Node.js warnings

### Test Coverage

The test suite covers:

1. **Project Menu** ✅ - Project management, save/load, sharing, URL persistence
2. **DSL Editor** ✅ - Text editing, syntax highlighting, parsing, error display, undo/redo, parts support
3. **Room Positioning** ✅ - Zero Point system, relative positioning, offsets
4. **Architectural Elements** ✅ - Doors, windows, wall positioning, parts support
5. **SVG Rendering** ✅ - ViewBox, grid, hover effects, click handlers
6. **Error Handling** ✅ - DSL syntax errors, positioning errors, validation

See [TESTING.md](TESTING.md) for comprehensive testing guide.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔮 Future Enhancements

- [ ] Export to PNG/PDF
- [ ] Room rotation support
- [ ] Curved walls and non-rectangular rooms
- [ ] Furniture library
- [ ] Area calculations and measurements
- [ ] Multi-floor support
- [ ] 3D visualization mode
- [ ] Template library
- [ ] Collaborative editing

## 📞 Support

- **Documentation**: See [CLAUDE.md](CLAUDE.md) for development guidance
- **Testing Guide**: See [TESTING.md](TESTING.md) for testing documentation
- **Issues**: Report bugs via GitHub Issues

## 🙏 Acknowledgments

- Built with React, TypeScript, and Vite
- Powered by PEG.js for DSL parsing
- Inspired by architectural CAD tools
- SVG rendering for precision and scalability

---

Made with ❤️ for architects, designers, and space planners
