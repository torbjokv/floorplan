import { useState, useEffect } from 'react';
import type { FloorplanData, Room, Door, Window, RoomObject, RoomPart, Anchor } from '../types';
import './GUIEditor.css';

// Constants
const DEFAULT_ROOM_SIZE = 3000; // mm
const DEFAULT_DOOR_WIDTH = 800; // mm
const DEFAULT_DOOR_OFFSET = 1000; // mm
const DEFAULT_WINDOW_WIDTH = 1200; // mm
const DEFAULT_WINDOW_OFFSET = 1000; // mm
const DEFAULT_OBJECT_SIZE = 1000; // mm
const DEFAULT_OBJECT_COLOR = '#888888';

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

  // Generate a unique room ID
  const generateRoomId = (baseName: string): string => {
    const base = baseName.toLowerCase().replace(/\s+/g, '');
    let counter = 1;
    let id = `${base}${counter}`;
    const existingIds = new Set(localData.rooms.map(r => r.id));
    while (existingIds.has(id)) {
      counter++;
      id = `${base}${counter}`;
    }
    return id;
  };

  const addRoom = () => {
    const roomName = `Room ${localData.rooms.length + 1}`;
    const newRoom: Room = {
      id: generateRoomId(roomName),
      name: roomName,
      width: DEFAULT_ROOM_SIZE,
      depth: DEFAULT_ROOM_SIZE,
      attachTo: 'zeropoint:top-left',
    };
    // Add room at the beginning (on top)
    const updatedRooms = [newRoom, ...localData.rooms];
    updateData({ ...localData, rooms: updatedRooms });
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
      room: localData.rooms[0]?.id ? `${localData.rooms[0].id}:bottom` : 'room1:bottom',
      offset: DEFAULT_DOOR_OFFSET,
      width: DEFAULT_DOOR_WIDTH,
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
      room: localData.rooms[0]?.id ? `${localData.rooms[0].id}:top` : 'room1:top',
      offset: DEFAULT_WINDOW_OFFSET,
      width: DEFAULT_WINDOW_WIDTH,
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
      width: DEFAULT_OBJECT_SIZE,
      height: DEFAULT_OBJECT_SIZE,
      color: DEFAULT_OBJECT_COLOR,
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

  const addRoomPart = (roomIndex: number) => {
    const room = localData.rooms[roomIndex];
    const partName = `Part ${(room.parts || []).length + 1}`;
    const newPart: RoomPart = {
      id: generateRoomId(partName),
      name: partName,
      width: DEFAULT_ROOM_SIZE,
      depth: DEFAULT_ROOM_SIZE,
      attachTo: 'parent:bottom-left',
    };
    const newParts = [...(room.parts || []), newPart];
    updateRoom(roomIndex, { ...room, parts: newParts });
  };

  const updateRoomPart = (roomIndex: number, partIndex: number, part: RoomPart) => {
    const room = localData.rooms[roomIndex];
    const newParts = [...(room.parts || [])];
    newParts[partIndex] = part;
    updateRoom(roomIndex, { ...room, parts: newParts });
  };

  const deleteRoomPart = (roomIndex: number, partIndex: number) => {
    const room = localData.rooms[roomIndex];
    const newParts = (room.parts || []).filter((_, i) => i !== partIndex);
    updateRoom(roomIndex, { ...room, parts: newParts });
  };

  // Get list of rooms for dropdowns (show name, use ID)
  // Add Zero Point as first option
  const roomList = [
    { id: 'zeropoint', name: '⚫ Zero Point (0,0)' },
    ...localData.rooms.map(r => ({ id: r.id, name: r.name || r.id }))
  ];

  return (
    <div className="gui-editor">
      <div className="gui-section">
        <div className="section-header">
          <h3>🏠 Rooms</h3>
          <button onClick={addRoom} className="add-button">+ Add Room</button>
        </div>
        {localData.rooms.map((room, index) => (
          <div key={room.id} className="item-card" data-room-id={room.id}>
            <div className="card-header">
              <input
                type="text"
                value={room.name || room.id}
                placeholder="Room name"
                onChange={(e) => updateRoom(index, { ...room, name: e.target.value })}
                className="room-name-input"
              />
              <button onClick={() => deleteRoom(index)} className="delete-button">Delete</button>
            </div>
            <div style={{ fontSize: '0.85em', color: '#999', marginBottom: '8px' }}>
              ID: {room.id}
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
                  Attach To:
                  <select
                    value={room.attachTo?.split(':')[0] || ''}
                    onChange={(e) => {
                      const currentAnchor = room.attachTo?.split(':')[1] || 'top-left';
                      updateRoom(index, { ...room, attachTo: `${e.target.value}:${currentAnchor}` });
                    }}
                  >
                    {roomList.filter((r) => r.id !== room.id).map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </label>

                {room.attachTo && room.attachTo.split(':')[0] !== 'zeropoint' && (
                  <div>
                    <label className="section-label">Attach To Corner:</label>
                    <AnchorSelector
                      value={(room.attachTo?.split(':')[1] as Anchor) || 'top-left'}
                      onChange={(anchor) => {
                        const roomId = room.attachTo?.split(':')[0] || roomList[0]?.id;
                        updateRoom(index, { ...room, attachTo: `${roomId}:${anchor}` });
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Offset fields */}
              <div className="form-grid" style={{ marginTop: '10px' }}>
                <label>
                  Offset X (mm):
                  <input
                    type="number"
                    value={room.offset?.[0] ?? 0}
                    onChange={(e) => {
                      const newOffset: [number, number] = [Number(e.target.value), room.offset?.[1] ?? 0];
                      updateRoom(index, { ...room, offset: newOffset });
                    }}
                  />
                </label>
                <label>
                  Offset Y (mm):
                  <input
                    type="number"
                    value={room.offset?.[1] ?? 0}
                    onChange={(e) => {
                      const newOffset: [number, number] = [room.offset?.[0] ?? 0, Number(e.target.value)];
                      updateRoom(index, { ...room, offset: newOffset });
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Room Parts */}
            <div className="objects-section">
              <div className="section-header-small">
                <span className="section-label">Room Parts (Composite Shapes)</span>
                <button onClick={() => addRoomPart(index)} className="add-button-small">+ Add Part</button>
              </div>
              {(room.parts || []).map((part, partIndex) => {
                // Build part list for attachTo dropdown (parent + other parts)
                const partList = [
                  { id: 'parent', name: '↑ Parent Room' },
                  ...(room.parts || []).filter((_, i) => i !== partIndex).map(p => ({ id: p.id, name: p.name || p.id }))
                ];
                return (
                  <div key={partIndex} className="object-card">
                    <div className="card-header" style={{ marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={part.name || part.id}
                        placeholder="Part name"
                        onChange={(e) => updateRoomPart(index, partIndex, { ...part, name: e.target.value })}
                        className="room-name-input"
                        style={{ fontSize: '14px', padding: '6px 10px' }}
                      />
                      <button onClick={() => deleteRoomPart(index, partIndex)} className="delete-button-small">×</button>
                    </div>
                    <div style={{ fontSize: '0.8em', color: '#999', marginBottom: '10px' }}>
                      ID: {part.id}
                    </div>
                    <div className="form-grid-small">
                      <label>
                        Width (mm):
                        <input
                          type="number"
                          value={part.width}
                          onChange={(e) => updateRoomPart(index, partIndex, { ...part, width: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        Depth (mm):
                        <input
                          type="number"
                          value={part.depth}
                          onChange={(e) => updateRoomPart(index, partIndex, { ...part, depth: Number(e.target.value) })}
                        />
                      </label>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label className="section-label">My Anchor:</label>
                      <AnchorSelector
                        value={part.anchor}
                        onChange={(anchor) => updateRoomPart(index, partIndex, { ...part, anchor })}
                      />
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label className="section-label">Attach To:</label>
                      <select
                        value={part.attachTo?.split(':')[0] || 'parent'}
                        onChange={(e) => {
                          const currentAnchor = part.attachTo?.split(':')[1] || 'bottom-left';
                          updateRoomPart(index, partIndex, { ...part, attachTo: `${e.target.value}:${currentAnchor}` });
                        }}
                        style={{ width: '100%', marginTop: '5px' }}
                      >
                        {partList.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label className="section-label">Attach To Corner:</label>
                      <AnchorSelector
                        value={(part.attachTo?.split(':')[1] as Anchor) || 'bottom-left'}
                        onChange={(anchor) => {
                          const refId = part.attachTo?.split(':')[0] || 'parent';
                          updateRoomPart(index, partIndex, { ...part, attachTo: `${refId}:${anchor}` });
                        }}
                      />
                    </div>
                    <div className="form-grid-small" style={{ marginTop: '10px' }}>
                      <label>
                        Offset X (mm):
                        <input
                          type="number"
                          value={part.offset?.[0] ?? 0}
                          onChange={(e) => {
                            const newOffset: [number, number] = [Number(e.target.value), part.offset?.[1] ?? 0];
                            updateRoomPart(index, partIndex, { ...part, offset: newOffset });
                          }}
                        />
                      </label>
                      <label>
                        Offset Y (mm):
                        <input
                          type="number"
                          value={part.offset?.[1] ?? 0}
                          onChange={(e) => {
                            const newOffset: [number, number] = [part.offset?.[0] ?? 0, Number(e.target.value)];
                            updateRoomPart(index, partIndex, { ...part, offset: newOffset });
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
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
                    <div style={{ marginTop: '10px' }}>
                      <label className="section-label">Anchor Point (both object and room):</label>
                      <AnchorSelector
                        value={obj.anchor || obj.roomAnchor}
                        onChange={(anchor) => updateRoomObject(index, objIndex, { ...obj, anchor, roomAnchor: anchor })}
                      />
                    </div>
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
        {(localData.doors || []).map((door, index) => {
          const roomName = localData.rooms.find(r => r.id === door.room.split(':')[0])?.name || door.room.split(':')[0];
          return (
          <div key={index} className="item-card" data-door-index={index}>
            <div className="card-header">
              <span className="item-label">{roomName} - Door {index + 1}</span>
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
            <div className="form-grid">
              <label>
                Type:
                <select
                  value={door.type ?? 'normal'}
                  onChange={(e) => updateDoor(index, { ...door, type: e.target.value as 'normal' | 'opening' })}
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
                    onChange={(e) => updateDoor(index, { ...door, swing: e.target.value as any })}
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

      <div className="gui-section">
        <div className="section-header">
          <h3>🪟 Windows</h3>
          <button onClick={addWindow} className="add-button">+ Add Window</button>
        </div>
        {(localData.windows || []).map((window, index) => {
          const roomName = localData.rooms.find(r => r.id === window.room.split(':')[0])?.name || window.room.split(':')[0];
          return (
          <div key={index} className="item-card" data-window-index={index}>
            <div className="card-header">
              <span className="item-label">{roomName} - Window {index + 1}</span>
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
                  {roomList.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
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
        );
        })}
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
