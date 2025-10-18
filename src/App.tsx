import { useState, useEffect } from 'react'
import './App.css'
import { JSONEditor } from './components/JSONEditor'
import { GUIEditor } from './components/GUIEditor'
import { FloorplanRenderer } from './components/FloorplanRenderer'
import type { FloorplanData, Room } from './types'

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

interface SavedProject {
  id: string;
  name: string;
  json: string;
  timestamp: number;
}

// Generate a random project ID
function generateProjectId(): string {
  return 'proj_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Parse JSON data from URL hash
function parseHashData(): string | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;

  try {
    const params = new URLSearchParams(hash);
    const data = params.get('data');
    if (data) {
      return decodeURIComponent(data);
    }
    // Fallback: old format (just JSON in hash)
    return decodeURIComponent(hash);
  } catch {
    return null;
  }
}

function App() {
  const [urlError, setUrlError] = useState<string | null>(null);

  const [jsonText, setJsonText] = useState(() => {
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
  });

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
  const [showUpdateAnimation, setShowUpdateAnimation] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [activeTab, setActiveTab] = useState<'json' | 'gui'>('gui');
  const [editorCollapsed, setEditorCollapsed] = useState(false);

  // Undo/Redo history
  const [history, setHistory] = useState<string[]>([jsonText]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Update JSON with history tracking
  const updateJsonText = (newText: string, skipHistory = false) => {
    setJsonText(newText);

    if (!skipHistory && newText !== history[historyIndex]) {
      // Remove any history after current index (when adding new changes after undo)
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newText);
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }
      setHistory(newHistory);
    }
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setJsonText(history[newIndex]);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setJsonText(history[newIndex]);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
    try {
      const saved = localStorage.getItem('floorplan_projects');
      if (!saved) return [];

      const projects: SavedProject[] = JSON.parse(saved);
      // Migrate old projects without IDs
      let needsMigration = false;
      const migrated = projects.map(p => {
        if (!p.id) {
          needsMigration = true;
          return {
            ...p,
            id: generateProjectId()
          };
        }
        return p;
      });

      // Save migrated data back to localStorage
      if (needsMigration) {
        localStorage.setItem('floorplan_projects', JSON.stringify(migrated));
      }

      return migrated;
    } catch {
      return [];
    }
  });
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

  const [showProjectMenu, setShowProjectMenu] = useState(false);

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
  }, [jsonText]);

  // Close project menu on ESC key or click outside
  useEffect(() => {
    if (!showProjectMenu) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProjectMenu(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.project-header')) {
        setShowProjectMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProjectMenu]);

  const handlePositioningErrors = (errors: string[]) => {
    setPositioningErrors(errors);
  };

  const handleRoomClick = (roomId: string) => {
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
  };

  const handleDoorClick = (doorIndex: number) => {
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
  };

  const handleWindowClick = (windowIndex: number) => {
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
  };

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
      // Find the rightmost edge of all existing rooms
      const SPACING = 500; // mm spacing between rooms

      // For rooms attached to zeropoint, calculate their actual positions
      let maxX = 0;
      floorplanData.rooms.forEach(room => {
        if (room.attachTo?.startsWith('zeropoint:') && room.offset) {
          const roomRightEdge = room.offset[0] + room.width;
          if (roomRightEdge > maxX) {
            maxX = roomRightEdge;
          }
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

  const handleRoomUpdate = (data: FloorplanData) => {
    // Update JSON text from drag and drop changes
    updateJsonText(JSON.stringify(data, null, 2));
  };

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
      localStorage.setItem('floorplan_projects', JSON.stringify(updated));
    }, 1000); // Debounce 1s

    return () => clearTimeout(timer);
  }, [jsonText, projectName, projectId, isExistingProject]);

  const handleLoadProject = (project: SavedProject) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setJsonText(project.json);
    setIsExistingProject(true); // Mark as existing to prevent auto-save
    setShowProjectMenu(false);
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
    localStorage.setItem('floorplan_projects', JSON.stringify(updated));

    // Load the duplicated project
    setProjectId(newId);
    setProjectName(newName);
    setJsonText(sourceProject.json);
    setIsExistingProject(false); // New copy, allow auto-save
    setShowProjectMenu(false);
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = savedProjects.filter(p => p.id !== projectId);
    setSavedProjects(updated);
    localStorage.setItem('floorplan_projects', JSON.stringify(updated));
  };

  const handleNewProject = () => {
    setProjectId(generateProjectId());
    setProjectName('Untitled Project');
    setJsonText(defaultJSON);
    setIsExistingProject(false); // New project, allow auto-save
    setShowProjectMenu(false);
  };

  const handleLoadExample = () => {
    setProjectId(generateProjectId());
    setProjectName('Example Floorplan');
    setJsonText(defaultJSON);
    setShowProjectMenu(false);
  };

  return (
    <div className={`app-container ${editorCollapsed ? 'show-grid' : ''}`}>
      <div className={`editor-section ${editorCollapsed ? 'collapsed' : ''}`}>
        <button
          className={`collapse-toggle-btn ${editorCollapsed ? 'collapsed' : ''}`}
          onClick={() => setEditorCollapsed(!editorCollapsed)}
          title={editorCollapsed ? "Expand editor" : "Collapse editor"}
        >
          {editorCollapsed ? '▶' : '◀'}
        </button>
        {!editorCollapsed && (
          <>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'gui' ? 'active' : ''}`}
            onClick={() => setActiveTab('gui')}
          >
            GUI Editor
          </button>
          <button
            className={`tab ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON Editor
          </button>
        </div>
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
        <div className="button-row">
          {activeTab === 'json' && (
            <button className="format-button" onClick={handleFormatJSON}>
              Format JSON
            </button>
          )}
          <button className="download-button" onClick={handleDownloadJSON}>
            💾 Download JSON
          </button>
          <button className="share-button" onClick={handleShare}>
            🔗 Share
          </button>
        </div>
        </>
        )}
      </div>
      <div className="preview-section">
        <div className="project-header">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="project-name-input"
          />
          <div className="project-menu-container">
            <button className="project-menu-button" onClick={() => setShowProjectMenu(!showProjectMenu)}>
              📁 Projects
            </button>
            {showProjectMenu && (
              <div className="project-menu">
                <button onClick={handleNewProject} className="project-menu-item">
                  📄 New Project
                </button>
                <button onClick={handleLoadExample} className="project-menu-item">
                  📋 Load Example
                </button>
                <button onClick={handleUploadJSON} className="project-menu-item">
                  📁 Upload JSON
                </button>
                <button onClick={() => handleDuplicateProject()} className="project-menu-item">
                  📑 Duplicate Current Project
                </button>
                <div className="project-menu-divider" />
                <button onClick={() => { handleDownloadJSON(); setShowProjectMenu(false); }} className="project-menu-item">
                  💾 Download JSON
                </button>
                <button onClick={() => { handleShare(); setShowProjectMenu(false); }} className="project-menu-item">
                  🔗 Share
                </button>
                <div className="project-menu-divider" />
                <div className="project-menu-label">Saved Projects:</div>
                {savedProjects.length === 0 ? (
                  <div className="project-menu-empty">No saved projects</div>
                ) : (
                  savedProjects.map((project) => (
                    <div key={project.name} className="project-menu-saved">
                      <button
                        onClick={() => handleLoadProject(project)}
                        className="project-menu-load"
                      >
                        {project.name}
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="project-menu-delete"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="undo-redo-buttons">
          <button
            className="undo-button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            className="redo-button"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>
          <a
            href="https://github.com/torbjokv/floorplan"
            target="_blank"
            rel="noopener noreferrer"
            className="manual-link"
            title="View JSON format documentation"
          >
            📖 Manual
          </a>
        </div>
        {showUpdateAnimation && (
          <div className="update-indicator">
            ✓ Updated
          </div>
        )}
        {showCopyNotification && (
          <div className="copy-notification">
            ✓ Link copied to clipboard!
          </div>
        )}
        {urlError && (
          <div className="url-error-notification">
            ⚠ {urlError}
          </div>
        )}
        <FloorplanRenderer
          data={floorplanData}
          onPositioningErrors={handlePositioningErrors}
          onRoomClick={handleRoomClick}
          onDoorClick={handleDoorClick}
          onWindowClick={handleWindowClick}
          onRoomUpdate={handleRoomUpdate}
        />
        <button className="download-svg-button" onClick={handleDownloadSVG}>
          📥 Download SVG
        </button>
        <button className="add-room-button" onClick={handleAddRoom}>
          + Add Room
        </button>
        {(positioningErrors.length > 0 || jsonError) && (
          <div className="error-panel">
            {jsonError && (
              <div className="error-message json-error">
                <strong>JSON Error:</strong> {jsonError}
              </div>
            )}
            {positioningErrors.map((error, idx) => (
              <div key={idx} className={`error-message ${error.startsWith('Error:') ? 'positioning-error' : 'positioning-warning'}`}>
                {error}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
