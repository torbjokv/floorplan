import { useState, useEffect } from 'react'
import './App.css'
import { JSONEditor } from './components/JSONEditor'
import { GUIEditor } from './components/GUIEditor'
import { FloorplanRenderer } from './components/FloorplanRenderer'
import type { FloorplanData } from './types'

const defaultJSON = `{
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
      "width": 4000,
      "depth": 3000
    },
    {
      "name": "Composite Room",
      "width": 3000,
      "depth": 2000,
      "attachTo": "Living Room:bottom-left",
      "parts": [
        {
          "name": "1",
          "width": 1000,
          "depth": 1000,
          "attachTo": "parent:bottom-left"
        },
        {
          "name": "2",
          "width": 500,
          "depth": 500,
          "attachTo": "1:bottom-left"
        }
      ]
    }
  ],
  "doors": [
    {
      "room": "Living Room:bottom",
      "offset": 1000,
      "width": 800,
      "swing": "inwards-right"
    },
    {
      "room": "Kitchen:left",
      "offset": 1000,
      "width": 800,
      "swing": "inwards-left"
    }
  ],
  "windows": [
    {
      "room": "Kitchen:top",
      "offset": 1000,
      "width": 1200
    },
    {
      "room": "Living Room:top",
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

function App() {
  const [jsonText, setJsonText] = useState(() => {
    // Try to load JSON from URL hash (format: #name=ProjectName&data=jsonData)
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const params = new URLSearchParams(hash);
        const data = params.get('data');
        if (data) {
          return decodeURIComponent(data);
        }
        // Fallback: old format (just JSON in hash)
        return decodeURIComponent(hash);
      } catch {
        return defaultJSON;
      }
    }
    return defaultJSON;
  });
  const [floorplanData, setFloorplanData] = useState<FloorplanData>(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const params = new URLSearchParams(hash);
        const data = params.get('data');
        if (data) {
          return JSON.parse(decodeURIComponent(data));
        }
        // Fallback: old format
        return JSON.parse(decodeURIComponent(hash));
      } catch {
        return JSON.parse(defaultJSON);
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
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
    try {
      const saved = localStorage.getItem('floorplan_projects');
      return saved ? JSON.parse(saved) : [];
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
        if (name) {
          const decodedName = decodeURIComponent(name);
          // Check if a project with this name already exists
          const saved = localStorage.getItem('floorplan_projects');
          const projects: SavedProject[] = saved ? JSON.parse(saved) : [];
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
  const [projectId, setProjectId] = useState<string>(() => generateProjectId());
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

        // Update URL hash with project name and encoded JSON
        const params = new URLSearchParams();
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

  const handleGUIChange = (data: FloorplanData) => {
    // Update JSON text from GUI changes
    setJsonText(JSON.stringify(data, null, 2));
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

  // Auto-save whenever jsonText or projectName changes
  useEffect(() => {
    // Don't save if project name is empty or it's the default example
    if (!projectName || projectName === 'Example Floorplan') return;

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
  }, [jsonText, projectName, projectId]);

  const handleLoadProject = (project: SavedProject) => {
    setProjectId(project.id);
    setProjectName(project.name);
    setJsonText(project.json);
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
    setShowProjectMenu(false);
  };

  const handleLoadExample = () => {
    setProjectId(generateProjectId());
    setProjectName('Example Floorplan');
    setJsonText(defaultJSON);
    setShowProjectMenu(false);
  };

  return (
    <div className="app-container">
      <div className="editor-section">
        <div className="project-header">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="project-name-input"
          />
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
        {activeTab === 'json' ? (
          <JSONEditor
            value={jsonText}
            onChange={setJsonText}
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
      </div>
      <div className="preview-section">
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
        <FloorplanRenderer data={floorplanData} onPositioningErrors={handlePositioningErrors} />
        <button className="download-svg-button" onClick={handleDownloadSVG}>
          📥 Download SVG
        </button>
      </div>
    </div>
  )
}

export default App
