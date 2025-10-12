import { useState, useEffect } from 'react';
import type { FloorplanData, Room, Door, Window } from '../types';
import './GUIEditor.css';

interface GUIEditorProps {
  data: FloorplanData;
  onChange: (data: FloorplanData) => void;
}

export function GUIEditor({ data, onChange }: GUIEditorProps) {
  const [localData, setLocalData] = useState<FloorplanData>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const updateData = (newData: FloorplanData) => {
    setLocalData(newData);
    onChange(newData);
  };

  const updateGridStep = (gridStep: number) => {
    updateData({ ...localData, grid_step: gridStep });
  };

  const addRoom = () => {
    const newRoom: Room = {
      name: `Room ${localData.rooms.length + 1}`,
      width: 3000,
      depth: 3000,
      x: 0,
      y: 0,
    };
    updateData({ ...localData, rooms: [...localData.rooms, newRoom] });
  };

  const updateRoom = (index: number, room: Room) => {
    const newRooms = [...localData.rooms];
    newRooms[index] = room;
    updateData({ ...localData, rooms: newRooms });
  };

  const deleteRoom = (index: number) => {
    const newRooms = localData.rooms.filter((_, i) => i !== index);
    updateData({ ...localData, rooms: newRooms });
  };

  const addDoor = () => {
    const newDoor: Door = {
      room: localData.rooms[0]?.name ? `${localData.rooms[0].name}:bottom` : 'Room:bottom',
      offset: 1000,
      width: 800,
      swing: 'inwards-right',
    };
    updateData({ ...localData, doors: [...(localData.doors || []), newDoor] });
  };

  const updateDoor = (index: number, door: Door) => {
    const newDoors = [...(localData.doors || [])];
    newDoors[index] = door;
    updateData({ ...localData, doors: newDoors });
  };

  const deleteDoor = (index: number) => {
    const newDoors = (localData.doors || []).filter((_, i) => i !== index);
    updateData({ ...localData, doors: newDoors });
  };

  const addWindow = () => {
    const newWindow: Window = {
      room: localData.rooms[0]?.name ? `${localData.rooms[0].name}:top` : 'Room:top',
      offset: 1000,
      width: 1200,
    };
    updateData({ ...localData, windows: [...(localData.windows || []), newWindow] });
  };

  const updateWindow = (index: number, window: Window) => {
    const newWindows = [...(localData.windows || [])];
    newWindows[index] = window;
    updateData({ ...localData, windows: newWindows });
  };

  const deleteWindow = (index: number) => {
    const newWindows = (localData.windows || []).filter((_, i) => i !== index);
    updateData({ ...localData, windows: newWindows });
  };

  return (
    <div className="gui-editor">
      <div className="gui-section">
        <h3>Grid Settings</h3>
        <div className="form-row">
          <label>
            Grid Step (mm):
            <input
              type="number"
              value={localData.grid_step}
              onChange={(e) => updateGridStep(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="gui-section">
        <div className="section-header">
          <h3>Rooms</h3>
          <button onClick={addRoom} className="add-button">+ Add Room</button>
        </div>
        {localData.rooms.map((room, index) => (
          <div key={index} className="item-card">
            <div className="card-header">
              <input
                type="text"
                value={room.name}
                onChange={(e) => updateRoom(index, { ...room, name: e.target.value })}
                className="room-name-input"
              />
              <button onClick={() => deleteRoom(index)} className="delete-button">Delete</button>
            </div>
            <div className="form-grid">
              <label>
                Width (mm):
                <input
                  type="number"
                  value={room.width}
                  onChange={(e) => updateRoom(index, { ...room, width: Number(e.target.value) })}
                />
              </label>
              <label>
                Depth (mm):
                <input
                  type="number"
                  value={room.depth}
                  onChange={(e) => updateRoom(index, { ...room, depth: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                X Position:
                <input
                  type="number"
                  value={room.x ?? ''}
                  placeholder="auto"
                  onChange={(e) => updateRoom(index, { ...room, x: e.target.value ? Number(e.target.value) : undefined })}
                />
              </label>
              <label>
                Y Position:
                <input
                  type="number"
                  value={room.y ?? ''}
                  placeholder="auto"
                  onChange={(e) => updateRoom(index, { ...room, y: e.target.value ? Number(e.target.value) : undefined })}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Anchor:
                <select
                  value={room.anchor ?? 'top-left'}
                  onChange={(e) => updateRoom(index, { ...room, anchor: e.target.value as any })}
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </label>
              <label>
                Attach To:
                <input
                  type="text"
                  value={room.attachTo ?? ''}
                  placeholder="e.g., Room:top-right"
                  onChange={(e) => updateRoom(index, { ...room, attachTo: e.target.value || undefined })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="gui-section">
        <div className="section-header">
          <h3>Doors</h3>
          <button onClick={addDoor} className="add-button">+ Add Door</button>
        </div>
        {(localData.doors || []).map((door, index) => (
          <div key={index} className="item-card">
            <div className="card-header">
              <span className="item-label">Door {index + 1}</span>
              <button onClick={() => deleteDoor(index)} className="delete-button">Delete</button>
            </div>
            <div className="form-grid">
              <label>
                Room:Wall:
                <input
                  type="text"
                  value={door.room}
                  placeholder="RoomName:wall"
                  onChange={(e) => updateDoor(index, { ...door, room: e.target.value })}
                />
              </label>
              <label>
                Width (mm):
                <input
                  type="number"
                  value={door.width}
                  onChange={(e) => updateDoor(index, { ...door, width: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Offset (mm):
                <input
                  type="number"
                  value={door.offset ?? 0}
                  onChange={(e) => updateDoor(index, { ...door, offset: Number(e.target.value) })}
                />
              </label>
              <label>
                Swing:
                <select
                  value={door.swing ?? 'inwards-right'}
                  onChange={(e) => updateDoor(index, { ...door, swing: e.target.value as any })}
                >
                  <option value="inwards-left">Inwards Left</option>
                  <option value="inwards-right">Inwards Right</option>
                  <option value="outwards-left">Outwards Left</option>
                  <option value="outwards-right">Outwards Right</option>
                </select>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="gui-section">
        <div className="section-header">
          <h3>Windows</h3>
          <button onClick={addWindow} className="add-button">+ Add Window</button>
        </div>
        {(localData.windows || []).map((window, index) => (
          <div key={index} className="item-card">
            <div className="card-header">
              <span className="item-label">Window {index + 1}</span>
              <button onClick={() => deleteWindow(index)} className="delete-button">Delete</button>
            </div>
            <div className="form-grid">
              <label>
                Room:Wall:
                <input
                  type="text"
                  value={window.room}
                  placeholder="RoomName:wall"
                  onChange={(e) => updateWindow(index, { ...window, room: e.target.value })}
                />
              </label>
              <label>
                Width (mm):
                <input
                  type="number"
                  value={window.width}
                  onChange={(e) => updateWindow(index, { ...window, width: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Offset (mm):
                <input
                  type="number"
                  value={window.offset ?? 0}
                  onChange={(e) => updateWindow(index, { ...window, offset: Number(e.target.value) })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
