import { useState, useEffect } from 'react'
import './App.css'
import { JSONEditor } from './components/JSONEditor'
import { FloorplanRenderer } from './components/FloorplanRenderer'
import type { FloorplanData } from './types'

  //TODO: remove scale everywhere. we dont need it  
  //TODO: rename height to depth everywhere
  
const defaultJSON = `{
  "scale": 2,
  "grid_step": 1000,
  "rooms": [
    {
      "name": "Living Room",
      "x": 0,
      "y": 0,
      "width": 4000,
      "height": 3000
    },
    {
      "name": "Kitchen",
      "anchor": "top-left",
      "attachTo": "Living Room:top-right",
      "offset": [500, 0],
      "width": 4000,
      "height": 3000
    },
    {
      "name": "Composite Room",
      "width": 3000,
      "height": 2000,
      "anchor": "top-left",
      "attachTo": "Living Room:bottom-left",
      "offset": [0, 500],
      "addition": [
        {
          "name": "1",
          "width": 1000,
          "height": 1000,
          "anchor": "top-left",
          "attachTo": "parent:bottom-left",
          "offset": [0, 0]
        },
        {
          "name": "2",
          "width": 500,
          "height": 500,
          "anchor": "top-left",
          "attachTo": "1:bottom-left",
          "offset": [0, 0]
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
        scale: 2,
        grid_step: 1000,
        rooms: []
      };
    }
  });
  const [jsonError, setJsonError] = useState<string>('');
  const [showUpdateAnimation, setShowUpdateAnimation] = useState(false);

  // Auto-update on JSON changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const data = JSON.parse(jsonText);
        setFloorplanData(data);
        setJsonError('');
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
      setShowUpdateAnimation(true);
      setTimeout(() => setShowUpdateAnimation(false), 1000);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  return (
    <div className="app-container">
      <div className="editor-section">
        <JSONEditor
          value={jsonText}
          onChange={setJsonText}
          error={jsonError}
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
        <FloorplanRenderer data={floorplanData} />
      </div>
    </div>
  )
}

export default App
