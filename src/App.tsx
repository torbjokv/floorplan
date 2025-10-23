import { useState, useEffect, useCallback } from 'react'
import './App.css'

// Components
import { JSONEditor } from './components/JSONEditor'
import { GUIEditor } from './components/GUIEditor'
import { FloorplanRenderer } from './components/FloorplanRenderer'
import { ProjectHeader } from './components/ui/ProjectHeader/ProjectHeader'
import { UndoRedoControls } from './components/ui/UndoRedoControls/UndoRedoControls'
import { EditorTabs } from './components/ui/EditorTabs/EditorTabs'
import { ErrorPanel } from './components/ui/ErrorPanel/ErrorPanel'
import { Notifications } from './components/ui/Notifications/Notifications'

// Types
import type { SavedProject } from './components/ui/ProjectMenu/ProjectMenu'
import type { FloorplanData, Room } from './types'

// Utilities and Hooks
import { generateProjectId, parseHashData, loadSavedProjects, saveSavedProjects } from './utils/projectUtils'
import { resolveRoomPositions } from './utils'
import { useUndoRedo } from './hooks/useUndoRedo'

const defaultJSON = `{
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
      "width": 4000,
      "depth": 3000
    },
    {
      "id": "composite1",
      "name": "Composite Room",
      "width": 3000,
      "depth": 2000,
      "attachTo": "livingroom1:bottom-left",
      "parts": [
        {
          "id": "part1",
          "name": "1",
          "width": 1000,
          "depth": 1000,
          "attachTo": "parent:bottom-left"
        },
        {
          "id": "part2",
          "name": "2",
          "width": 500,
          "depth": 500,
          "attachTo": "part1:bottom-left"
        }
      ]
    }
  ],
  "doors": [
    {
      "room": "livingroom1:bottom",
      "offset": 1000,
      "width": 800,
      "swing": "inwards-right"
    },
    {
      "room": "kitchen1:left",
      "offset": 1000,
      "width": 800,
      "swing": "inwards-left"
    }
  ],
  "windows": [
    {
      "room": "kitchen1:top",
      "offset": 1000,
      "width": 1200
    },
    {
      "room": "livingroom1:top",
      "offset": 1000,
      "width": 1200
    }
  ]
}`;

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const [urlError, setUrlError] = useState<string | null>(null);

  // ============================================================================
  // Undo/Redo State
  // ============================================================================

  const initialJsonValue = (() => {
    const hashData = parseHashData();
    if (hashData) {
      try {
        JSON.parse(hashData); // Validate it's valid JSON
        return hashData;
      } catch (e) {
        setUrlError('Invalid JSON in URL - using default template');
      }
    }
    return defaultJSON;
  })();

  const { value: jsonText, setValue: setJsonText, undo, redo, canUndo, canRedo, setValueDirect } = useUndoRedo(initialJsonValue);

  // Helper function to update JSON with history tracking
  const updateJsonText = (newText: string) => {
    setJsonText(newText);
  };

  // ============================================================================
  // UI State
  // ============================================================================

  const [activeTab, setActiveTab] = useState<'json' | 'gui'>('gui');
  const [editorCollapsed, setEditorCollapsed] = useState(() => {
    const saved = localStorage.getItem('floorplan_editor_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [showUpdateAnimation, setShowUpdateAnimation] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  // ============================================================================
  // Floorplan Data State
  // ============================================================================

  const [floorplanData, setFloorplanData] = useState<FloorplanData>(() => {
    const hashData = parseHashData();
    if (hashData) {
      try {
        const parsed = JSON.parse(hashData);
        // Validate it has required fields
        if (!parsed.rooms || !Array.isArray(parsed.rooms)) {
          setUrlError('Invalid floorplan data in URL - missing rooms array');
          return JSON.parse(defaultJSON);
        }
        return parsed;
      } catch {
        setUrlError('Failed to parse JSON from URL - using default template');
        // Fall through to default
      }
    }
    try {
      return JSON.parse(defaultJSON);
    } catch {
      return {
        grid_step: 1000,
        rooms: []
      };
    }
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

  // Track if this is an existing project loaded from URL (don't auto-save these)
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

  // Auto-update on JSON changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const data = JSON.parse(jsonText);
        setFloorplanData(data);
        setJsonError('');
        setPositioningErrors([]);
        setShowUpdateAnimation(true);
        setTimeout(() => setShowUpdateAnimation(false), 1000);

        // Update URL hash with project ID, name and encoded JSON
        const params = new URLSearchParams();
        params.set('id', encodeURIComponent(projectId));
        params.set('name', encodeURIComponent(projectName));
        params.set('data', encodeURIComponent(jsonText));
        window.history.replaceState(null, '', '#' + params.toString());
      } catch (e) {
        setJsonError((e as Error).message);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [jsonText, projectId, projectName]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handlePositioningErrors = useCallback((errors: string[]) => {
    setPositioningErrors(errors);
  }, []);

  const handleRoomClick = useCallback((roomId: string) => {
    // Switch to GUI tab if not already there
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
  }, [activeTab]);

  const handleDoorClick = useCallback((doorIndex: number) => {
    // Switch to GUI tab if not already there
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
  }, [activeTab]);

  const handleWindowClick = useCallback((windowIndex: number) => {
    // Switch to GUI tab if not already there
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
  }, [activeTab]);

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

    updateJsonText(JSON.stringify(updatedData, null, 2));

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

  const handleGUIChange = (data: FloorplanData) => {
    // Update JSON text from GUI changes
    updateJsonText(JSON.stringify(data, null, 2));
  };

  const handleRoomUpdate = useCallback((data: FloorplanData) => {
    // Immediately update floorplan data for instant visual feedback
    setFloorplanData(data);

    // Defer JSON stringify to avoid blocking UI on drop
    setTimeout(() => {
      updateJsonText(JSON.stringify(data, null, 2));
    }, 0);
  }, [updateJsonText]);

  const handleRoomNameUpdate = useCallback((roomId: string, newName: string) => {
    // Update room name in the floorplan data
    // Parse current JSON to avoid dependency on floorplanData state
    try {
      const data = JSON.parse(jsonText);
      const updatedRooms = data.rooms.map((room: Room) =>
        room.id === roomId ? { ...room, name: newName } : room
      );
      updateJsonText(JSON.stringify({ ...data, rooms: updatedRooms }, null, 2));
    } catch (e) {
      console.error('Failed to update room name:', e);
    }
  }, [jsonText, updateJsonText]);

  const handleObjectClick = useCallback((roomId: string, objectIndex: number) => {
    // Switch to GUI tab and scroll to the specific object
    if (activeTab !== 'gui') {
      setActiveTab('gui');
    }
    setTimeout(() => {
      // Try to find the specific object first
      const objectElement = document.querySelector(`[data-room-id="${roomId}"][data-object-index="${objectIndex}"]`);
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
  }, [activeTab]);

  const handleDownloadJSON = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floorplan.json';
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

  const handleFormatJSON = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
    } catch (err) {
      // If parsing fails, do nothing
      console.error('Cannot format invalid JSON:', err);
    }
  };

  const handleUploadJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text);

          // Check if this project already exists in localStorage
          // Look for project ID in URL format if the file was exported with ID
          const filename = file.name.replace('.json', '');

          // If project with this ID already exists, show warning
          const existingProject = savedProjects.find(p => p.name === filename);
          if (existingProject) {
            if (!confirm(`A project named "${filename}" already exists. This file will not be imported to prevent duplicates. Use the "Duplicate" button in the project menu to create a copy if needed.`)) {
              return;
            }
            // User confirmed, but we still won't overwrite - just load it without saving
          }

          setJsonText(JSON.stringify(parsed, null, 2));
          // Generate new project ID for uploaded file
          setProjectId(generateProjectId());

          // Set project name from filename
          if (filename && filename !== 'floorplan') {
            setProjectName(filename);
          }
        } catch (err) {
          alert('Failed to parse JSON file: ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Auto-save whenever jsonText or projectName changes
  useEffect(() => {
    // Don't save if:
    // - project name is empty or it's the default example
    // - this is an existing project loaded from URL (user must use duplicate)
    if (!projectName || projectName === 'Example Floorplan' || isExistingProject) return;

    const timer = setTimeout(() => {
      const newProject: SavedProject = {
        id: projectId,
        name: projectName,
        json: jsonText,
        timestamp: Date.now(),
      };
      // Update by ID, not name
      const updated = [newProject, ...savedProjects.filter(p => p.id !== projectId)];
      setSavedProjects(updated);
      saveSavedProjects(updated);
    }, 1000); // Debounce 1s

    return () => clearTimeout(timer);
  }, [jsonText, projectName, projectId, isExistingProject]);

  const handleLoadProject = (project: SavedProject) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setValueDirect(project.json); // Bypass history when loading projects
    setIsExistingProject(false); // Allow auto-save for loaded projects from localStorage
  };

  const handleDuplicateProject = (project?: SavedProject) => {
    // If no project provided, duplicate the current one
    const sourceProject = project || {
      id: projectId,
      name: projectName,
      json: jsonText,
      timestamp: Date.now()
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
      timestamp: Date.now()
    };

    const updated = [duplicatedProject, ...savedProjects];
    setSavedProjects(updated);
    saveSavedProjects(updated);

    // Load the duplicated project
    setProjectId(newId);
    setProjectName(newName);
    setValueDirect(sourceProject.json); // Bypass history when loading projects
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
    setValueDirect(defaultJSON); // Bypass history when creating new project
    setIsExistingProject(false); // New project, allow auto-save
  };

  const handleLoadExample = () => {
    setProjectId(generateProjectId());
    setProjectName('Example Floorplan');
    setValueDirect(defaultJSON); // Bypass history when loading example
  };

  return (
    <div className={`app-container ${editorCollapsed ? 'show-grid' : ''}`} data-testid="app-container">
      <div className={`editor-section ${editorCollapsed ? 'collapsed' : ''}`} data-testid="editor-section">
        <button
          className={`collapse-toggle-btn ${editorCollapsed ? 'collapsed' : ''}`}
          onClick={() => setEditorCollapsed(!editorCollapsed)}
          title={editorCollapsed ? "Expand editor" : "Collapse editor"}
          data-testid="collapse-toggle-btn"
        >
          {editorCollapsed ? '▶' : '◀'}
        </button>
        {!editorCollapsed && (
          <>
        <EditorTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'json' ? (
          <JSONEditor
            value={jsonText}
            onChange={updateJsonText}
            error={jsonError}
            warnings={positioningErrors}
          />
        ) : (
          <GUIEditor
            data={floorplanData}
            onChange={handleGUIChange}
          />
        )}
        <div className="button-row" data-testid="editor-button-row">
          {activeTab === 'json' && (
            <button className="format-button" onClick={handleFormatJSON} data-testid="format-json-btn">
              Format JSON
            </button>
          )}
          <button className="download-button" onClick={handleDownloadJSON} data-testid="download-json-btn">
            💾 Download JSON
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
          onDownloadJSON={handleDownloadJSON}
          onShare={handleShare}
          onLoadProject={handleLoadProject}
          onDeleteProject={handleDeleteProject}
        />
        <UndoRedoControls
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
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
        />
        <button className="download-svg-button" onClick={handleDownloadSVG} data-testid="download-svg-btn">
          📥 Download SVG
        </button>
        <button className="add-room-button" onClick={handleAddRoom} data-testid="add-room-btn">
          + Add Room
        </button>
        <ErrorPanel
          jsonError={jsonError}
          positioningErrors={positioningErrors}
        />
      </div>
    </div>
  )
}

export default App
