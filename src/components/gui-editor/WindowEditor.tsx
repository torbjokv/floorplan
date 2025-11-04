import type { Window, Room } from '../../types';
import './WindowEditor.css';

interface RoomListItem {
  id: string;
  name: string;
}

interface WindowEditorProps {
  windows: Window[];
  rooms: Room[];
  roomList: RoomListItem[];
  onAddWindow: () => void;
  onUpdateWindow: (index: number, window: Window) => void;
  onDeleteWindow: (index: number) => void;
}

export function WindowEditor({
  windows,
  rooms,
  roomList,
  onAddWindow,
  onUpdateWindow,
  onDeleteWindow,
}: WindowEditorProps) {
  return (
    <div className="gui-section" data-testid="window-editor">
      <div className="section-header">
        <h3>🪟 Windows</h3>
        <button onClick={onAddWindow} className="add-button" data-testid="add-window-button">
          + Add Window
        </button>
      </div>
      {windows.map((window, index) => {
        const roomId = window.room?.split(':')[0] || '';
        const roomName = rooms.find(r => r.id === roomId)?.name || roomId;
        return (
          <div
            key={index}
            className="item-card"
            data-window-index={index}
            data-testid={`window-card-${index}`}
          >
            <div className="card-header">
              <span className="item-label">
                {roomName} - Window {index + 1}
              </span>
              <button
                onClick={() => onDeleteWindow(index)}
                className="delete-button"
                data-testid={`delete-window-button-${index}`}
              >
                Delete
              </button>
            </div>
            <div className="form-grid">
              <label>
                Room:
                <select
                  value={window.room?.split(':')[0] || ''}
                  onChange={e => {
                    const wall = window.room?.split(':')[1] || 'top';
                    onUpdateWindow(index, { ...window, room: `${e.target.value}:${wall}` });
                  }}
                >
                  {roomList.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Wall:
                <select
                  value={window.room?.split(':')[1] || 'top'}
                  onChange={e => {
                    const roomName = window.room?.split(':')[0] || '';
                    onUpdateWindow(index, { ...window, room: `${roomName}:${e.target.value}` });
                  }}
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                Width (mm):
                <input
                  type="number"
                  value={window.width}
                  onChange={e =>
                    onUpdateWindow(index, { ...window, width: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Offset (mm):
                <input
                  type="number"
                  value={window.offset ?? 0}
                  onChange={e =>
                    onUpdateWindow(index, { ...window, offset: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
