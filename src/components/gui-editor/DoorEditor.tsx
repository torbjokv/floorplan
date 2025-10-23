import type { Door, Room, SwingDirection } from '../../types';
import './DoorEditor.css';

interface RoomListItem {
  id: string;
  name: string;
}

interface DoorEditorProps {
  doors: Door[];
  rooms: Room[];
  roomList: RoomListItem[];
  onAddDoor: () => void;
  onUpdateDoor: (index: number, door: Door) => void;
  onDeleteDoor: (index: number) => void;
}

export function DoorEditor({
  doors,
  rooms,
  roomList,
  onAddDoor,
  onUpdateDoor,
  onDeleteDoor,
}: DoorEditorProps) {
  return (
    <div className="gui-section" data-testid="door-editor">
      <div className="section-header">
        <h3>🚪 Doors</h3>
        <button onClick={onAddDoor} className="add-button" data-testid="add-door-button">+ Add Door</button>
      </div>
      {doors.map((door, index) => {
        const roomName = rooms.find(r => r.id === door.room.split(':')[0])?.name || door.room.split(':')[0];
        return (
          <div key={index} className="item-card" data-door-index={index} data-testid={`door-card-${index}`}>
            <div className="card-header">
              <span className="item-label">{roomName} - Door {index + 1}</span>
              <button onClick={() => onDeleteDoor(index)} className="delete-button" data-testid={`delete-door-button-${index}`}>Delete</button>
            </div>
            <div className="form-grid">
              <label>
                Room:
                <select
                  value={door.room.split(':')[0]}
                  onChange={(e) => {
                    const wall = door.room.split(':')[1] || 'bottom';
                    onUpdateDoor(index, { ...door, room: `${e.target.value}:${wall}` });
                  }}
                >
                  {roomList.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Wall:
                <select
                  value={door.room.split(':')[1] || 'bottom'}
                  onChange={(e) => {
                    const roomName = door.room.split(':')[0];
                    onUpdateDoor(index, { ...door, room: `${roomName}:${e.target.value}` });
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
                  value={door.width}
                  onChange={(e) => onUpdateDoor(index, { ...door, width: Number(e.target.value) })}
                />
              </label>
              <label>
                Offset (mm):
                <input
                  type="number"
                  value={door.offset ?? 0}
                  onChange={(e) => onUpdateDoor(index, { ...door, offset: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Type:
                <select
                  value={door.type ?? 'normal'}
                  onChange={(e) => onUpdateDoor(index, { ...door, type: e.target.value as 'normal' | 'opening' })}
                  data-testid={`door-type-${index}`}
                >
                  <option value="normal">Normal (with door blade)</option>
                  <option value="opening">Opening (no door blade)</option>
                </select>
              </label>
              {door.type !== 'opening' && (
                <label>
                  Swing Direction:
                  <select
                    value={door.swing ?? 'inwards-right'}
                    onChange={(e) => onUpdateDoor(index, { ...door, swing: e.target.value as SwingDirection })}
                    data-testid={`door-swing-${index}`}
                  >
                    <option value="inwards-left">Inwards Left</option>
                    <option value="inwards-right">Inwards Right</option>
                    <option value="outwards-left">Outwards Left</option>
                    <option value="outwards-right">Outwards Right</option>
                  </select>
                </label>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
