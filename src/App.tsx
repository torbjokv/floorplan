import { useState, useEffect, useCallback } from 'react';
import './App.css';

// Components
import { GUIEditor } from './components/GUIEditor';
import { DSLEditor } from './components/DSLEditor';
import { FloorplanRenderer } from './components/FloorplanRenderer';
import { ProjectHeader } from './components/ui/ProjectHeader/ProjectHeader';
import { UndoRedoControls } from './components/ui/UndoRedoControls/UndoRedoControls';
import { EditorTabs } from './components/ui/EditorTabs/EditorTabs';
import { ErrorPanel } from './components/ui/ErrorPanel/ErrorPanel';
import { Notifications } from './components/ui/Notifications/Notifications';

// Types
import type { SavedProject } from './components/ui/ProjectMenu/ProjectMenu';
import type { FloorplanData, Room } from './types';

// Utilities and Hooks
import {
  generateProjectId,
  parseHashData,
  loadSavedProjects,
  saveSavedProjects,
} from './utils/projectUtils';
import { resolveRoomPositions } from './utils';
import { useUndoRedo } from './hooks/useUndoRedo';
import { parseDSL, jsonToDSL, type DSLError } from './dslUtils';

const defaultDSL = `grid 1000

room Livingroom1 "Living Room" 4000x3000 at zeropoint:top-left
    window 1200 at top (1000)
    door 800 inwards-right at bottom (1000)

room Kitchen1 "Kitchen" 4000x3000 at Livingroom1:top-right
    window 1200 at top (1000)
    door 800 inwards-left at left (1000)

room Composite1 "Composite Room" 3000x2000 at Livingroom1:bottom-left
    part Part1 1000x1000 at room:bottom-left
    part Part2 500x500 at Part1:bottom-left`;

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const [urlError] = useState<string | null>(null);

  // ============================================================================
  // Undo/Redo State (DSL is now primary)
  // ============================================================================

  const initialDslValue = (() => {
    const hashData = parseHashData();
    if (hashData) {
      try {
        // Try to parse as JSON first (backward compatibility)
        const parsed = JSON.parse(hashData);
        // Convert JSON to DSL
        return jsonToDSL(parsed);
      } catch {
        // If not JSON, treat as DSL
        return hashData;
      }
    }
    return defaultDSL;
  })();

  const {
    value: dslText,
    setValue: setDslText,
    undo,
    redo,
    canUndo,
    canRedo,
    setValueDirect,
  } = useUndoRedo(initialDslValue);

  // Helper function to update DSL with history tracking
  const updateDslText = useCallback(
    (newText: string) => {
      setDslText(newText);
    },
    [setDslText]
  );

  // ============================================================================
  // UI State
  // ============================================================================

  const [activeTab, setActiveTab] = useState<'gui' | 'dsl'>('dsl'); // Default to DSL
  const [dslErrors, setDslErrors] = useState<DSLError[]>([]);
  const [editorCollapsed, setEditorCollapsed] = useState(() => {
    const saved = localStorage.getItem('floorplan_editor_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [showUpdateAnimation, setShowUpdateAnimation] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  // Selection state for SVG editor (for delete functionality)
  const [selectedElement, setSelectedElement] = useState<{
    type: 'room' | 'door' | 'window' | 'object';
    index?: number;
    roomId?: string;
  } | null>(null);

  // ============================================================================
  // Floorplan Data State (derived from DSL)
  // ============================================================================

  const [floorplanData, setFloorplanData] = useState<FloorplanData>(() => {
    const { config, errors } = parseDSL(initialDslValue);
    if (config && errors.length === 0) {
      return config;
    }
    // Fallback to empty floorplan
    return {
      grid_step: 1000,
      rooms: [],
    };
  });
  const [jsonError, setJsonError] = useState<string>('');
  const [positioningErrors, setPositioningErrors] = useState<string[]>([]);

  // ============================================================================
  // Project Management State
  // ============================================================================

  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(loadSavedProjects);
  const [projectName, setProjectName] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const params = new URLSearchParams(hash);
        const name = params.get('name');
        const urlId = params.get('id');
        if (name) {
          const decodedName = decodeURIComponent(name);
          // Only check for duplicates if this is NOT an existing project being refreshed
          // (i.e., if the project ID in URL doesn't match any saved project)
          const saved = localStorage.getItem('floorplan_projects');
          const projects: SavedProject[] = saved ? JSON.parse(saved) : [];

          // If this project ID exists in saved projects, use the name as-is (it's a refresh)
          if (urlId && projects.some(p => p.id === decodeURIComponent(urlId))) {
            return decodedName;
          }

          // Otherwise, check for duplicate names and append number if needed
          const existingNames = new Set(projects.map(p => p.name));
          if (existingNames.has(decodedName)) {
            // Find next available number
            let num = 2;
            while (existingNames.has(`${decodedName} ${num}`)) {
              num++;
            }
            return `${decodedName} ${num}`;
          }
          return decodedName;
        }
      } catch {
        // Ignore
      }
    }
    return 'Untitled Project';
  });
  const [projectId, setProjectId] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const params = new URLSearchParams(hash);
        const id = params.get('id');
        if (id) {
          return decodeURIComponent(id);
        }
      } catch {
        // Ignore
      }
    }
    return generateProjectId();
  });

  const [isExistingProject, setIsExistingProject] = useState<boolean>(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const params = new URLSearchParams(hash);
        const id = params.get('id');
        if (id) {
          const saved = localStorage.getItem('floorplan_projects');
          if (saved) {
            const projects: SavedProject[] = JSON.parse(saved);
            return projects.some(p => p.id === decodeURIComponent(id));
          }
        }
      } catch {
        // Ignore
      }
    }
    return false;
  });

  // Save editor collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('floorplan_editor_collapsed', JSON.stringify(editorCollapsed));
  }, [editorCollapsed]);

  // Auto-update on DSL changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const { config, errors } = parseDSL(dslText);
      setDslErrors(errors);

      if (config && errors.length === 0) {
        setFloorplanData(config);
        setJsonError('');
        setPositioningErrors([]);
        setShowUpdateAnimation(true);
        setTimeout(() => setShowUpdateAnimation(false), 1000);

        // Update URL hash with project ID, name and encoded DSL
        const params = new URLSearchParams();
        params.set('id', encodeURIComponent(projectId));
        params.set('name', encodeURIComponent(projectName));
        params.set('data', encodeURIComponent(dslText));
        window.history.replaceState(null, '', '#' + params.toString());
      } else {
        // On parse error, show error but keep old floorplan data
        setJsonError(errors.map(e => e.message).join('\n'));
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [dslText, projectId, projectName]);

  // No more sync effects needed - DSL is the source of truth!

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handlePositioningErrors = useCallback((errors: string[]) => {
    setPositioningErrors(errors);
  }, []);

  const handleRoomClick = useCallback(
    (roomId: string) => {
      // If DSL tab is active, select the room for potential deletion
      if (activeTab === 'dsl') {
        setSelectedElement({ type: 'room', roomId });
        return;
      }
      // Otherwise switch to GUI tab and scroll to room
      if (activeTab !== 'gui') {
        setActiveTab('gui');
      }
      // Wait for tab switch, then scroll to room
      setTimeout(() => {
        const roomElement = document.querySelector(`[data-room-id="${roomId}"]`);
        if (roomElement) {
          roomElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    },
    [activeTab]
  );

  const handleDoorClick = useCallback(
    (doorIndex: number) => {
      // If DSL tab is active, select the door for potential deletion
      if (activeTab === 'dsl') {
        setSelectedElement({ type: 'door', index: doorIndex });
        return;
      }
      // Otherwise switch to GUI tab and scroll
      if (activeTab !== 'gui') {
        setActiveTab('gui');
      }
      // Wait for tab switch, then scroll to door
      setTimeout(() => {
        const doorElement = document.querySelector(`[data-door-index="${doorIndex}"]`);
        if (doorElement) {
          doorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    },
    [activeTab]
  );

  const handleWindowClick = useCallback(
    (windowIndex: number) => {
      // If DSL tab is active, select the window for potential deletion
      if (activeTab === 'dsl') {
        setSelectedElement({ type: 'window', index: windowIndex });
        return;
      }
      // Otherwise switch to GUI tab and scroll
      if (activeTab !== 'gui') {
        setActiveTab('gui');
      }
      // Wait for tab switch, then scroll to window
      setTimeout(() => {
        const windowElement = document.querySelector(`[data-window-index="${windowIndex}"]`);
        if (windowElement) {
          windowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    },
    [activeTab]
  );

  const handleAddRoom = () => {
    const DEFAULT_ROOM_SIZE = 3000; // mm
    const roomName = `Room ${floorplanData.rooms.length + 1}`;

    // Generate unique room ID
    const generateRoomId = (baseName: string): string => {
      const base = baseName.toLowerCase().replace(/\s+/g, '');
      let counter = 1;
      let id = `${base}${counter}`;
      const existingIds = new Set(floorplanData.rooms.map(r => r.id));
      while (existingIds.has(id)) {
        counter++;
        id = `${base}${counter}`;
      }
      return id;
    };

    // Calculate smart offset for new room by finding actual maximum x extent
    let xOffset = 0;
    let yOffset = 0;

    if (floorplanData.rooms.length > 0) {
      // Find the rightmost edge of all existing rooms using the positioning system
      const SPACING = 500; // mm spacing between rooms

      // Resolve all room positions to get actual coordinates
      const { roomMap } = resolveRoomPositions(floorplanData.rooms);

      let maxX = 0;
      Object.values(roomMap).forEach(room => {
        const roomRightEdge = room.x + room.width;
        if (roomRightEdge > maxX) {
          maxX = roomRightEdge;
        }
      });

      xOffset = maxX + SPACING;
      yOffset = 0;
    }

    const newRoom: Room = {
      id: generateRoomId(roomName),
      name: roomName,
      width: DEFAULT_ROOM_SIZE,
      depth: DEFAULT_ROOM_SIZE,
      attachTo: 'zeropoint:top-left',
      offset: [xOffset, yOffset],
    };

    const updatedData = {
      ...floorplanData,
      rooms: [...floorplanData.rooms, newRoom],
    };

    const dsl = jsonToDSL(updatedData);
    updateDslText(dsl);

    // Switch to GUI tab and scroll to new room
    if (activeTab !== 'gui') {
      setActiveTab('gui');
    }
    setTimeout(() => {
      const roomElement = document.querySelector(`[data-room-id="${newRoom.id}"]`);
      if (roomElement) {
        roomElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleAddDoor = () => {
    if (floorplanData.rooms.length === 0) {
      alert('Please add a room first before adding a door.');
      return;
    }

    const firstRoom = floorplanData.rooms[0];
    const newDoor: Door = {
      room: `${firstRoom.id}:bottom`,
      offset: 1000,
      width: 800,
      swing: 'inwards-right',
      type: 'normal',
    };

    const updatedData = {
      ...floorplanData,
      doors: [...(floorplanData.doors || []), newDoor],
    };

    const dsl = jsonToDSL(updatedData);
    updateDslText(dsl);
  };

  const handleAddWindow = () => {
    if (floorplanData.rooms.length === 0) {
      alert('Please add a room first before adding a window.');
      return;
    }

    const firstRoom = floorplanData.rooms[0];
    const newWindow: Window = {
      room: `${firstRoom.id}:top`,
      offset: 1000,
      width: 1200,
    };

    const updatedData = {
      ...floorplanData,
      windows: [...(floorplanData.windows || []), newWindow],
    };

    const dsl = jsonToDSL(updatedData);
    updateDslText(dsl);
  };

  const handleAddObject = () => {
    if (floorplanData.rooms.length === 0) {
      alert('Please add a room first before adding an object.');
      return;
    }

    const firstRoom = floorplanData.rooms[0];
    const newObject = {
      type: 'square' as const,
      x: 1000,
      y: 1000,
      width: 800,
      height: 800,
      anchor: 'top-left' as const,
      roomAnchor: 'top-left' as const,
      color: '#33d17a',
      text: 'Object',
    };

    const updatedRooms = floorplanData.rooms.map(room => {
      if (room.id === firstRoom.id) {
        return {
          ...room,
          objects: [...(room.objects || []), newObject],
        };
      }
      return room;
    });

    const updatedData = {
      ...floorplanData,
      rooms: updatedRooms,
    };

    const dsl = jsonToDSL(updatedData);
    updateDslText(dsl);
  };

  const handleGUIChange = (data: FloorplanData) => {
    // Convert FloorplanData to DSL
    const dsl = jsonToDSL(data);
    updateDslText(dsl);
  };

  const handleRoomUpdate = useCallback(
    (data: FloorplanData) => {
      // Immediately update floorplan data for instant visual feedback
      setFloorplanData(data);

      // Defer DSL conversion to avoid blocking UI on drop
      setTimeout(() => {
        const dsl = jsonToDSL(data);
        updateDslText(dsl);
      }, 0);
    },
    [updateDslText]
  );

  const handleRoomNameUpdate = useCallback(
    (roomId: string, newName: string) => {
      // Update room name in the floorplan data
      const { config } = parseDSL(dslText);
      if (config) {
        const updatedRooms = config.rooms.map((room: Room) =>
          room.id === roomId ? { ...room, name: newName } : room
        );
        const dsl = jsonToDSL({ ...config, rooms: updatedRooms });
        updateDslText(dsl);
      }
    },
    [dslText, updateDslText]
  );

  const handleObjectClick = useCallback(
    (roomId: string, objectIndex: number) => {
      // If DSL tab is active, select the object for potential deletion
      if (activeTab === 'dsl') {
        setSelectedElement({ type: 'object', index: objectIndex, roomId });
        return;
      }
      // Otherwise switch to GUI tab and scroll to the specific object
      if (activeTab !== 'gui') {
        setActiveTab('gui');
      }
      setTimeout(() => {
        // Try to find the specific object first
        const objectElement = document.querySelector(
          `[data-room-id="${roomId}"][data-object-index="${objectIndex}"]`
        );
        if (objectElement) {
          objectElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Fallback to room if object not found
          const roomElement = document.querySelector(`[data-room-id="${roomId}"]`);
          if (roomElement) {
            roomElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    },
    [activeTab]
  );

  // ============================================================================
  // Drag Handlers for Doors, Windows, and Objects
  // ============================================================================

  const handleDoorDragUpdate = useCallback(
    (doorIndex: number, newRoomId: string, newWall: string, newOffset: number) => {
      const { config } = parseDSL(dslText);
      if (!config || !config.doors) return;

      const updatedDoors = config.doors.map((door, idx) =>
        idx === doorIndex
          ? { ...door, room: `${newRoomId}:${newWall}`, offset: newOffset }
          : door
      );

      const updatedData = { ...config, doors: updatedDoors };

      // Immediate optimistic update to avoid jump
      setFloorplanData(updatedData);

      // Update DSL (will re-parse after debounce)
      const dsl = jsonToDSL(updatedData);
      updateDslText(dsl);
    },
    [dslText, updateDslText]
  );

  const handleWindowDragUpdate = useCallback(
    (windowIndex: number, newRoomId: string, newWall: string, newOffset: number) => {
      const { config } = parseDSL(dslText);
      if (!config || !config.windows) return;

      const updatedWindows = config.windows.map((window, idx) =>
        idx === windowIndex
          ? { ...window, room: `${newRoomId}:${newWall}`, offset: newOffset }
          : window
      );

      const updatedData = { ...config, windows: updatedWindows };

      // Immediate optimistic update to avoid jump
      setFloorplanData(updatedData);

      // Update DSL (will re-parse after debounce)
      const dsl = jsonToDSL(updatedData);
      updateDslText(dsl);
    },
    [dslText, updateDslText]
  );

  const handleObjectDragUpdate = useCallback(
    (sourceRoomId: string, objectIndex: number, targetRoomId: string, newX: number, newY: number) => {
      const { config } = parseDSL(dslText);
      if (!config) return;

      let movedObject: any = null;

      // Remove object from source room
      const updatedRooms = config.rooms.map(room => {
        if (room.id === sourceRoomId && room.objects) {
          movedObject = { ...room.objects[objectIndex], x: newX, y: newY };

          // If moving within same room, just update position
          if (sourceRoomId === targetRoomId) {
            const updatedObjects = room.objects.map((obj, idx) =>
              idx === objectIndex ? movedObject : obj
            );
            return { ...room, objects: updatedObjects };
          }

          // If moving to different room, remove from this room
          const updatedObjects = room.objects.filter((_, idx) => idx !== objectIndex);
          return { ...room, objects: updatedObjects };
        }
        return room;
      });

      // If moved to different room, add to target room with top-left anchor
      if (sourceRoomId !== targetRoomId && movedObject) {
        const finalRooms = updatedRooms.map(room => {
          if (room.id === targetRoomId) {
            // Reset anchors to top-left for cross-room move
            const adjustedObject = {
              ...movedObject,
              anchor: 'top-left',
              roomAnchor: 'top-left',
            };
            return {
              ...room,
              objects: [...(room.objects || []), adjustedObject],
            };
          }
          return room;
        });

        const updatedData = { ...config, rooms: finalRooms };

        // Immediate optimistic update to avoid jump
        setFloorplanData(updatedData);

        // Update DSL (will re-parse after debounce)
        const dsl = jsonToDSL(updatedData);
        updateDslText(dsl);
      } else {
        const updatedData = { ...config, rooms: updatedRooms };

        // Immediate optimistic update to avoid jump
        setFloorplanData(updatedData);

        // Update DSL (will re-parse after debounce)
        const dsl = jsonToDSL(updatedData);
        updateDslText(dsl);
      }
    },
    [dslText, updateDslText]
  );

  // Delete key handler for selected elements
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedElement) {
        event.preventDefault();

        const { config } = parseDSL(dslText);
        if (!config) return;

        let updatedData = { ...config };

        switch (selectedElement.type) {
          case 'door':
            if (selectedElement.index !== undefined) {
              updatedData.doors = config.doors?.filter((_, i) => i !== selectedElement.index) || [];
            }
            break;

          case 'window':
            if (selectedElement.index !== undefined) {
              updatedData.windows =
                config.windows?.filter((_, i) => i !== selectedElement.index) || [];
            }
            break;

          case 'object':
            if (selectedElement.roomId && selectedElement.index !== undefined) {
              updatedData.rooms = config.rooms.map(room => {
                if (room.id === selectedElement.roomId) {
                  return {
                    ...room,
                    objects: room.objects?.filter((_, i) => i !== selectedElement.index),
                  };
                }
                return room;
              });
            }
            break;

          case 'room':
            if (selectedElement.roomId) {
              updatedData.rooms = config.rooms.filter(r => r.id !== selectedElement.roomId);
            }
            break;
        }

        const dsl = jsonToDSL(updatedData);
        updateDslText(dsl);
        setSelectedElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, dslText, updateDslText]);

  const handleDownloadDSL = () => {
    // Download the DSL source
    const blob = new Blob([dslText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.floorplan`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSVG = () => {
    const svgElement = document.querySelector('.floorplan-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floorplan.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShowCopyNotification(true);
      setTimeout(() => setShowCopyNotification(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleFormatDSL = () => {
    // Format DSL by re-converting it (this will normalize formatting)
    const { config } = parseDSL(dslText);
    if (config) {
      const normalized = jsonToDSL(config);
      updateDslText(normalized);
    }
  };

  const handleUploadJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,.dsl,.floorplan';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = event => {
        try {
          const text = event.target?.result as string;
          const filename = file.name.replace(/\.(json|dsl|floorplan)$/, '');

          let dsl: string;
          if (file.name.endsWith('.dsl') || file.name.endsWith('.floorplan')) {
            // Already DSL format
            dsl = text;
          } else {
            // Convert JSON to DSL
            const parsed = JSON.parse(text);
            dsl = jsonToDSL(parsed);
          }

          // Check if this project already exists in localStorage
          const existingProject = savedProjects.find(p => p.name === filename);
          if (existingProject) {
            if (
              !confirm(
                `A project named "${filename}" already exists. This file will not be imported to prevent duplicates. Use the "Duplicate" button in the project menu to create a copy if needed.`
              )
            ) {
              return;
            }
          }

          setValueDirect(dsl);
          // Generate new project ID for uploaded file
          setProjectId(generateProjectId());

          // Set project name from filename
          if (filename && filename !== 'floorplan') {
            setProjectName(filename);
          }
        } catch (err) {
          alert('Failed to parse file: ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Auto-save whenever dslText or projectName changes
  useEffect(() => {
    // Don't save if:
    // - project name is empty or it's the default example
    // - this is an existing project loaded from URL (user must use duplicate)
    if (!projectName || projectName === 'Example Floorplan' || isExistingProject) return;

    const timer = setTimeout(() => {
      const newProject: SavedProject = {
        id: projectId,
        name: projectName,
        json: dslText, // Store DSL in the json field (rename later)
        timestamp: Date.now(),
      };
      // Update by ID, not name
      const updated = [newProject, ...savedProjects.filter(p => p.id !== projectId)];
      setSavedProjects(updated);
      saveSavedProjects(updated);
    }, 1000); // Debounce 1s

    return () => clearTimeout(timer);
  }, [dslText, projectName, projectId, isExistingProject, savedProjects]);

  const handleLoadProject = (project: SavedProject) => {
    setProjectId(project.id);
    setProjectName(project.name);

    // Check if stored data is DSL or JSON
    let dsl = project.json;
    try {
      const parsed = JSON.parse(project.json);
      // It's JSON, convert to DSL
      dsl = jsonToDSL(parsed);
    } catch {
      // It's already DSL, use as-is
    }

    setValueDirect(dsl); // Bypass history when loading projects
    setIsExistingProject(false); // Allow auto-save for loaded projects from localStorage
  };

  const handleDuplicateProject = (project?: SavedProject) => {
    // If no project provided, duplicate the current one
    const sourceProject = project || {
      id: projectId,
      name: projectName,
      json: dslText,
      timestamp: Date.now(),
    };

    // Create a duplicate with a new ID and incremented name
    const newId = generateProjectId();
    let newName = sourceProject.name;

    // Find next available name (e.g., "Project 2", "Project 3", etc.)
    let counter = 2;
    while (savedProjects.some(p => p.name === newName)) {
      newName = `${sourceProject.name} ${counter}`;
      counter++;
    }

    const duplicatedProject: SavedProject = {
      id: newId,
      name: newName,
      json: sourceProject.json,
      timestamp: Date.now(),
    };

    const updated = [duplicatedProject, ...savedProjects];
    setSavedProjects(updated);
    saveSavedProjects(updated);

    // Load the duplicated project
    setProjectId(newId);
    setProjectName(newName);

    // Ensure it's DSL format
    let dsl = sourceProject.json;
    try {
      const parsed = JSON.parse(sourceProject.json);
      dsl = jsonToDSL(parsed);
    } catch {
      // Already DSL
    }

    setValueDirect(dsl); // Bypass history when loading projects
    setIsExistingProject(false); // New copy, allow auto-save
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = savedProjects.filter(p => p.id !== projectId);
    setSavedProjects(updated);
    saveSavedProjects(updated);
  };

  const handleNewProject = () => {
    setProjectId(generateProjectId());
    setProjectName('Untitled Project');
    setValueDirect(defaultDSL); // Bypass history when creating new project
    setIsExistingProject(false); // New project, allow auto-save
  };

  const handleLoadExample = () => {
    setProjectId(generateProjectId());
    setProjectName('Example Floorplan');
    setValueDirect(defaultDSL); // Bypass history when loading example
  };

  return (
    <div
      className={`app-container ${editorCollapsed ? 'show-grid' : ''}`}
      data-testid="app-container"
    >
      <div
        className={`editor-section ${editorCollapsed ? 'collapsed' : ''}`}
        data-testid="editor-section"
      >
        <button
          className={`collapse-toggle-btn ${editorCollapsed ? 'collapsed' : ''}`}
          onClick={() => setEditorCollapsed(!editorCollapsed)}
          title={editorCollapsed ? 'Expand editor' : 'Collapse editor'}
          data-testid="collapse-toggle-btn"
        >
          {editorCollapsed ? '▶' : '◀'}
        </button>
        {!editorCollapsed && (
          <>
            <EditorTabs activeTab={activeTab} onTabChange={setActiveTab} />
            {activeTab === 'dsl' ? (
              <DSLEditor value={dslText} onChange={updateDslText} readOnly={false} />
            ) : (
              <GUIEditor data={floorplanData} onChange={handleGUIChange} />
            )}
            <div className="button-row" data-testid="editor-button-row">
              {activeTab === 'dsl' && (
                <button
                  className="format-button"
                  onClick={handleFormatDSL}
                  data-testid="format-dsl-btn"
                >
                  Format DSL
                </button>
              )}
              <button
                className="download-button"
                onClick={handleDownloadDSL}
                data-testid="download-dsl-btn"
              >
                💾 Download DSL
              </button>
              <button className="share-button" onClick={handleShare} data-testid="share-btn">
                🔗 Share
              </button>
            </div>
          </>
        )}
      </div>
      <div className="preview-section" data-testid="preview-section">
        <ProjectHeader
          projectName={projectName}
          onProjectNameChange={setProjectName}
          savedProjects={savedProjects}
          onNewProject={handleNewProject}
          onLoadExample={handleLoadExample}
          onUploadJSON={handleUploadJSON}
          onDuplicateProject={() => handleDuplicateProject()}
          onShare={handleShare}
          onLoadProject={handleLoadProject}
          onDeleteProject={handleDeleteProject}
        />
        <UndoRedoControls canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
        <Notifications
          showUpdate={showUpdateAnimation}
          showCopy={showCopyNotification}
          urlError={urlError}
        />
        <FloorplanRenderer
          data={floorplanData}
          onPositioningErrors={handlePositioningErrors}
          onRoomClick={handleRoomClick}
          onDoorClick={handleDoorClick}
          onWindowClick={handleWindowClick}
          onRoomUpdate={handleRoomUpdate}
          onRoomNameUpdate={handleRoomNameUpdate}
          onObjectClick={handleObjectClick}
          onDoorDragUpdate={handleDoorDragUpdate}
          onWindowDragUpdate={handleWindowDragUpdate}
          onObjectDragUpdate={handleObjectDragUpdate}
        />
        <button
          className="download-svg-button"
          onClick={handleDownloadSVG}
          data-testid="download-svg-btn"
        >
          📥 Download SVG
        </button>
        <div className="svg-control-buttons">
          <button
            className="add-room-button"
            onClick={handleAddRoom}
            data-testid="svg-add-room-btn"
          >
            + Room
          </button>
          <button
            className="add-door-button"
            onClick={handleAddDoor}
            data-testid="svg-add-door-btn"
          >
            + Door
          </button>
          <button
            className="add-window-button"
            onClick={handleAddWindow}
            data-testid="svg-add-window-btn"
          >
            + Window
          </button>
          <button
            className="add-object-button"
            onClick={handleAddObject}
            data-testid="svg-add-object-btn"
          >
            + Object
          </button>
        </div>
        <ErrorPanel
          jsonError={jsonError}
          positioningErrors={positioningErrors}
          dslErrors={dslErrors}
        />
      </div>
    </div>
  );
}

export default App;
