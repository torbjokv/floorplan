import { useState, useEffect } from 'react'
import './App.css'
import { JSONEditor } from './components/JSONEditor'
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
      "addition": [
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
}`;

function App() {
  const [jsonText, setJsonText] = useState(defaultJSON);
  const [floorplanData, setFloorplanData] = useState<FloorplanData>(() => {
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
      } catch (e) {
        setJsonError((e as Error).message);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [jsonText]);

  const handleRender = () => {
    try {
      const data = JSON.parse(jsonText);
      setFloorplanData(data);
      setJsonError('');
      setPositioningErrors([]);
      setShowUpdateAnimation(true);
      setTimeout(() => setShowUpdateAnimation(false), 1000);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const handlePositioningErrors = (errors: string[]) => {
    setPositioningErrors(errors);
  };

  return (
    <div className="app-container">
      <div className="editor-section">
        <JSONEditor
          value={jsonText}
          onChange={setJsonText}
          error={jsonError}
          warnings={positioningErrors}
        />
        <button className="render-button" onClick={handleRender}>
          🔄 Render
        </button>
      </div>
      <div className="preview-section">
        {showUpdateAnimation && (
          <div className="update-indicator">
            ✓ Updated
          </div>
        )}
        <FloorplanRenderer data={floorplanData} onPositioningErrors={handlePositioningErrors} />
      </div>
    </div>
  )
}

export default App
