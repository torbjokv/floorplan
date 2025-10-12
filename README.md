# 🏠 Floorplan Designer

A browser-based SVG floorplan designer for creating architectural floor plans through JSON input with real-time visual feedback.

**🌐 Live Demo: [https://torbjokv.github.io/floorplan/](https://torbjokv.github.io/floorplan/)**

![React](https://img.shields.io/badge/React-19.1-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- **📝 JSON-Based Definition** - Define floor plans using a simple, intuitive JSON format
- **🔄 Real-Time Preview** - See changes instantly with automatic rendering (500ms debounce)
- **🎯 Flexible Positioning** - Position rooms absolutely or relatively using anchor points
- **🏗️ Composite Rooms** - Create complex shapes by combining rectangular sections
- **🚪 Architectural Elements** - Add doors with swing arcs and windows
- **⚠️ Smart Error Handling** - Get clear, actionable error messages for validation issues
- **📐 Dynamic Grid** - Configurable grid overlay for precise measurements
- **📏 Millimeter Precision** - All measurements in millimeters for architectural accuracy

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

### Basic Floor Plan

Create a simple floor plan with two rooms:

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
      "width": 3000,
      "depth": 3000
    }
  ]
}
```

### Adding Doors and Windows

```json
{
  "grid_step": 1000,
  "rooms": [...],
  "doors": [
    {
      "room": "Living Room:bottom",
      "offset": 1000,
      "width": 800,
      "swing": "inwards-right"
    }
  ],
  "windows": [
    {
      "room": "Kitchen:top",
      "offset": 1000,
      "width": 1200
    }
  ]
}
```

### Creating Composite Rooms

Build L-shaped or complex room layouts:

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

## 📚 JSON Schema Reference

### Room Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | required | Unique room identifier |
| `width` | number | required | Width in millimeters (x-axis) |
| `depth` | number | required | Depth in millimeters (y-axis) |
| `x`, `y` | number | 0 | Absolute coordinates |
| `anchor` | string | "top-left" | Attachment corner: `"top-right"`, `"bottom-left"`, `"bottom-right"` |
| `attachTo` | string | - | Reference: `"RoomName:corner"` (takes priority over x/y) |
| `offset` | [number, number] | [0, 0] | Position adjustment `[x, y]` |
| `addition` | array | - | Sub-parts for composite rooms |

### Door Properties

Doors have a fixed thickness of 100mm.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `room` | string | required | Room reference with wall: `"RoomName:wall"` where wall is `top`, `bottom`, `left`, or `right` |
| `width` | number | required | Door width in mm |
| `offset` | number | 0 | Distance along the wall from the wall's start in mm |
| `swing` | string | "inwards-right" | `"inwards-left"`, `"inwards-right"`, `"outwards-left"`, or `"outwards-right"` |

### Window Properties

Windows have a fixed thickness of 100mm.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `room` | string | required | Room reference with wall: `"RoomName:wall"` where wall is `top`, `bottom`, `left`, or `right` |
| `width` | number | required | Window width in mm |
| `offset` | number | 0 | Distance along the wall from the wall's start in mm |

## 🎨 Positioning System

### Absolute Positioning

Place rooms at specific coordinates:

```json
{
  "name": "Room1",
  "width": 4000,
  "depth": 3000
}
```

Note: `x` and `y` default to `0` when not specified.

### Relative Positioning

Attach rooms to other rooms using anchor points:

```json
{
  "name": "Room2",
  "attachTo": "Room1:top-right",
  "offset": [500, 0],
  "width": 3000,
  "depth": 3000
}
```

**Anchor Points**: `top-left` (default), `top-right`, `bottom-left`, `bottom-right`

**Offset**: Fine-tune position with `[x, y]` adjustments in millimeters

Note: If `anchor` is not specified, it defaults to `"top-left"`.

## 🏗️ Architecture

### Project Structure

```
src/
├── components/
│   ├── FloorplanRenderer.tsx  # SVG rendering engine
│   └── JSONEditor.tsx          # JSON input editor with validation
├── types.ts                    # TypeScript type definitions
├── utils.ts                    # Positioning logic and algorithms
└── App.tsx                     # Main application component
```

### Key Components

- **FloorplanRenderer**: Handles SVG rendering, grid overlay, and bounds calculation
- **JSONEditor**: Manages JSON input, validation, and error display
- **Positioning System**: Resolves room dependencies and calculates coordinates
- **Error Handler**: Validates JSON and detects positioning issues

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
