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

function App() {
  const [jsonText, setJsonText] = useState(() => {
    // Try to load JSON from URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
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

        // Update URL hash with encoded JSON
        window.history.replaceState(null, '', '#' + encodeURIComponent(jsonText));
      } catch (e) {
        setJsonError((e as Error).message);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [jsonText]);

  const handlePositioningErrors = (errors: string[]) => {
    setPositioningErrors(errors);
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

  return (
    <div className="app-container">
      <div className="editor-section">
        <JSONEditor
          value={jsonText}
          onChange={setJsonText}
          error={jsonError}
          warnings={positioningErrors}
        />
        <div className="button-row">
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
