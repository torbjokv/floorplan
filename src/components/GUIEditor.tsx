import { useState, useEffect } from 'react';
import type { FloorplanData, Room, Door, Window, RoomObject, Anchor } from '../types';
import './GUIEditor.css';

interface GUIEditorProps {
  data: FloorplanData;
  onChange: (data: FloorplanData) => void;
}

// Corner icon selector component
function AnchorSelector({ value, onChange }: { value?: Anchor; onChange: (anchor: Anchor) => void }) {
  const currentAnchor = value || 'top-left';

  return (
    <div className="anchor-selector">
      <button
        type="button"
        className={`anchor-corner top-left ${currentAnchor === 'top-left' ? 'active' : ''}`}
        onClick={() => onChange('top-left')}
        title="Top Left"
      >
        <div className="corner-dot" />
      </button>
      <button
        type="button"
        className={`anchor-corner top-right ${currentAnchor === 'top-right' ? 'active' : ''}`}
        onClick={() => onChange('top-right')}
        title="Top Right"
      >
        <div className="corner-dot" />
      </button>
      <button
        type="button"
        className={`anchor-corner bottom-left ${currentAnchor === 'bottom-left' ? 'active' : ''}`}
        onClick={() => onChange('bottom-left')}
        title="Bottom Left"
      >
        <div className="corner-dot" />
      </button>
      <button
        type="button"
        className={`anchor-corner bottom-right ${currentAnchor === 'bottom-right' ? 'active' : ''}`}
        onClick={() => onChange('bottom-right')}
        title="Bottom Right"
      >
        <div className="corner-dot" />
      </button>
    </div>
  );
}

export function GUIEditor({ data, onChange }: GUIEditorProps) {
  const [localData, setLocalData] = useState<FloorplanData>(data);
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const updateData = (newData: FloorplanData) => {
    setLocalData(newData);
    onChange(newData);
  };

  const toggleRoomExpanded = (index: number) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRooms(newExpanded);
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
    // Add room at the beginning (on top)
    updateData({ ...localData, rooms: [newRoom, ...localData.rooms] });
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

  const addRoomObject = (roomIndex: number) => {
    const room = localData.rooms[roomIndex];
    const newObject: RoomObject = {
      type: 'square',
      x: room.width / 2,
      y: room.depth / 2,
      width: 1000,
      height: 1000,
      color: '#888888',
    };
    const newObjects = [...(room.objects || []), newObject];
    updateRoom(roomIndex, { ...room, objects: newObjects });
  };

  const updateRoomObject = (roomIndex: number, objectIndex: number, obj: RoomObject) => {
    const room = localData.rooms[roomIndex];
    const newObjects = [...(room.objects || [])];
    newObjects[objectIndex] = obj;
    updateRoom(roomIndex, { ...room, objects: newObjects });
  };

  const deleteRoomObject = (roomIndex: number, objectIndex: number) => {
    const room = localData.rooms[roomIndex];
    const newObjects = (room.objects || []).filter((_, i) => i !== objectIndex);
    updateRoom(roomIndex, { ...room, objects: newObjects });
  };

  // Get list of room names for attachTo dropdown
  const roomNames = localData.rooms.map(r => r.name);

  return (
    <div className="gui-editor">
      <div className="gui-section">
        <div className="section-header">
          <h3>🏠 Rooms</h3>
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
            <div className="dimensions-layout">
              <div className="dimensions-stack">
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
              <div>
                <label className="section-label">My Anchor:</label>
                <AnchorSelector
                  value={room.anchor}
                  onChange={(anchor) => updateRoom(index, { ...room, anchor })}
                />
              </div>
            </div>

            {/* Attach To section */}
            <div className="form-section">
              <label className="section-label">Positioning</label>
              <div className="form-grid">
                <label>
                  Attach To Room:
                  <select
                    value={room.attachTo?.split(':')[0] || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const currentAnchor = room.attachTo?.split(':')[1] || 'top-left';
                        updateRoom(index, { ...room, attachTo: `${e.target.value}:${currentAnchor}`, x: undefined, y: undefined });
                      } else {
                        updateRoom(index, { ...room, attachTo: undefined });
                      }
                    }}
                  >
                    <option value="">-- None (use x, y) --</option>
                    {roomNames.filter((_, i) => i !== index).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>

                {room.attachTo && (
                  <div>
                    <label className="section-label">Attach To Corner:</label>
                    <AnchorSelector
                      value={(room.attachTo?.split(':')[1] as Anchor) || 'top-left'}
                      onChange={(anchor) => {
                        const roomName = room.attachTo?.split(':')[0] || roomNames[0];
                        updateRoom(index, { ...room, attachTo: `${roomName}:${anchor}` });
                      }}
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Collapsible x, y section */}
            <div className="collapsible-section">
              <button
                type="button"
                className="collapse-toggle"
                onClick={() => toggleRoomExpanded(index)}
              >
                {expandedRooms.has(index) ? '▼' : '▶'} Advanced (x, y coordinates)
              </button>
              {expandedRooms.has(index) && (
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
              )}
            </div>

            {/* Room Objects */}
            <div className="objects-section">
              <div className="section-header-small">
                <span className="section-label">Objects in Room</span>
                <button onClick={() => addRoomObject(index)} className="add-button-small">+ Add Object</button>
              </div>
              {(room.objects || []).map((obj, objIndex) => (
                <div key={objIndex} className="object-card">
                  <div className="object-header">
                    <select
                      value={obj.type}
                      onChange={(e) => updateRoomObject(index, objIndex, { ...obj, type: e.target.value as 'square' | 'circle' })}
                    >
                      <option value="square">Square</option>
                      <option value="circle">Circle</option>
                    </select>
                    <button onClick={() => deleteRoomObject(index, objIndex)} className="delete-button-small">×</button>
                  </div>
                  <div className="form-grid-small">
                    <label>
                      X:
                      <input
                        type="number"
                        value={obj.x}
                        onChange={(e) => updateRoomObject(index, objIndex, { ...obj, x: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Y:
                      <input
                        type="number"
                        value={obj.y}
                        onChange={(e) => updateRoomObject(index, objIndex, { ...obj, y: Number(e.target.value) })}
                      />
                    </label>
                    {obj.type === 'square' ? (
                      <>
                        <label>
                          Width:
                          <input
                            type="number"
                            value={obj.width || 1000}
                            onChange={(e) => updateRoomObject(index, objIndex, { ...obj, width: Number(e.target.value) })}
                          />
                        </label>
                        <label>
                          Height:
                          <input
                            type="number"
                            value={obj.height || 1000}
                            onChange={(e) => updateRoomObject(index, objIndex, { ...obj, height: Number(e.target.value) })}
                          />
                        </label>
                      </>
                    ) : (
                      <label>
                        Radius:
                        <input
                          type="number"
                          value={obj.radius || 500}
                          onChange={(e) => updateRoomObject(index, objIndex, { ...obj, radius: Number(e.target.value) })}
                        />
                      </label>
                    )}
                    <label>
                      Color:
                      <input
                        type="color"
                        value={obj.color || '#888888'}
                        onChange={(e) => updateRoomObject(index, objIndex, { ...obj, color: e.target.value })}
                      />
                    </label>
                    <label>
                      Text:
                      <input
                        type="text"
                        value={obj.text || ''}
                        placeholder="Optional label"
                        onChange={(e) => updateRoomObject(index, objIndex, { ...obj, text: e.target.value })}
                      />
                    </label>
                  </div>
                  {obj.type === 'square' && (
                    <>
                      <div style={{ marginTop: '10px' }}>
                        <label className="section-label">Object Anchor Point:</label>
                        <AnchorSelector
                          value={obj.anchor}
                          onChange={(anchor) => updateRoomObject(index, objIndex, { ...obj, anchor })}
                        />
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <label className="section-label">Room Anchor Point:</label>
                        <AnchorSelector
                          value={obj.roomAnchor}
                          onChange={(roomAnchor) => updateRoomObject(index, objIndex, { ...obj, roomAnchor })}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="gui-section">
        <div className="section-header">
          <h3>🚪 Doors</h3>
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
                Room:
                <select
                  value={door.room.split(':')[0]}
                  onChange={(e) => {
                    const wall = door.room.split(':')[1] || 'bottom';
                    updateDoor(index, { ...door, room: `${e.target.value}:${wall}` });
                  }}
                >
                  {roomNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                Wall:
                <select
                  value={door.room.split(':')[1] || 'bottom'}
                  onChange={(e) => {
                    const roomName = door.room.split(':')[0];
                    updateDoor(index, { ...door, room: `${roomName}:${e.target.value}` });
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
                  onChange={(e) => updateDoor(index, { ...door, width: Number(e.target.value) })}
                />
              </label>
              <label>
                Offset (mm):
                <input
                  type="number"
                  value={door.offset ?? 0}
                  onChange={(e) => updateDoor(index, { ...door, offset: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Swing Direction:
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
          <h3>🪟 Windows</h3>
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
                Room:
                <select
                  value={window.room.split(':')[0]}
                  onChange={(e) => {
                    const wall = window.room.split(':')[1] || 'top';
                    updateWindow(index, { ...window, room: `${e.target.value}:${wall}` });
                  }}
                >
                  {roomNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                Wall:
                <select
                  value={window.room.split(':')[1] || 'top'}
                  onChange={(e) => {
                    const roomName = window.room.split(':')[0];
                    updateWindow(index, { ...window, room: `${roomName}:${e.target.value}` });
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
                  onChange={(e) => updateWindow(index, { ...window, width: Number(e.target.value) })}
                />
              </label>
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

      <div className="gui-section">
        <h3>📐 Grid Settings</h3>
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
    </div>
  );
}
