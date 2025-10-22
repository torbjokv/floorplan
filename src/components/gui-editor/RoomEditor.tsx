import type { Room, RoomPart, RoomObject, Anchor } from '../../types';
import { AnchorSelector } from './AnchorSelector';
import './RoomEditor.css';

// Constants
const DEFAULT_ROOM_SIZE = 3000; // mm
const DEFAULT_OBJECT_SIZE = 1000; // mm
const DEFAULT_OBJECT_COLOR = '#888888';

interface RoomListItem {
  id: string;
  name: string;
}

interface RoomEditorProps {
  rooms: Room[];
  roomList: RoomListItem[];
  onAddRoom: () => void;
  onUpdateRoom: (index: number, room: Room) => void;
  onDeleteRoom: (index: number) => void;
  generateRoomId: (baseName: string) => string;
}

export function RoomEditor({
  rooms,
  roomList,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  generateRoomId,
}: RoomEditorProps) {
  const addRoomObject = (roomIndex: number) => {
    const room = rooms[roomIndex];
    const newObject: RoomObject = {
      type: 'square',
      x: 0,
      y: 0,
      width: DEFAULT_OBJECT_SIZE,
      height: DEFAULT_OBJECT_SIZE,
      color: DEFAULT_OBJECT_COLOR,
    };
    const newObjects = [...(room.objects || []), newObject];
    onUpdateRoom(roomIndex, { ...room, objects: newObjects });
  };

  const updateRoomObject = (roomIndex: number, objectIndex: number, obj: RoomObject) => {
    const room = rooms[roomIndex];
    const newObjects = [...(room.objects || [])];
    newObjects[objectIndex] = obj;
    onUpdateRoom(roomIndex, { ...room, objects: newObjects });
  };

  const deleteRoomObject = (roomIndex: number, objectIndex: number) => {
    const room = rooms[roomIndex];
    const newObjects = (room.objects || []).filter((_, i) => i !== objectIndex);
    onUpdateRoom(roomIndex, { ...room, objects: newObjects });
  };

  const addRoomPart = (roomIndex: number) => {
    const room = rooms[roomIndex];
    const partName = `Part ${(room.parts || []).length + 1}`;
    const newPart: RoomPart = {
      id: generateRoomId(partName),
      name: partName,
      width: DEFAULT_ROOM_SIZE,
      depth: DEFAULT_ROOM_SIZE,
      attachTo: 'parent:bottom-left',
    };
    const newParts = [...(room.parts || []), newPart];
    onUpdateRoom(roomIndex, { ...room, parts: newParts });
  };

  const updateRoomPart = (roomIndex: number, partIndex: number, part: RoomPart) => {
    const room = rooms[roomIndex];
    const newParts = [...(room.parts || [])];
    newParts[partIndex] = part;
    onUpdateRoom(roomIndex, { ...room, parts: newParts });
  };

  const deleteRoomPart = (roomIndex: number, partIndex: number) => {
    const room = rooms[roomIndex];
    const newParts = (room.parts || []).filter((_, i) => i !== partIndex);
    onUpdateRoom(roomIndex, { ...room, parts: newParts });
  };

  return (
    <div className="gui-section" data-testid="room-editor">
      <div className="section-header">
        <h3>🏠 Rooms</h3>
        <button onClick={onAddRoom} className="add-button" data-testid="add-room-button">+ Add Room</button>
      </div>
      {rooms.map((room, index) => (
        <div key={room.id} className="item-card" data-testid={`room-card-${room.id}`}>
          <div className="card-header" data-room-id={room.id}>
            <input
              type="text"
              value={room.name || room.id}
              placeholder="Room name"
              onChange={(e) => onUpdateRoom(index, { ...room, name: e.target.value })}
              className="room-name-input"
              data-testid={`room-name-input-${room.id}`}
            />
            <button onClick={() => onDeleteRoom(index)} className="delete-button" data-testid={`delete-room-button-${room.id}`}>Delete</button>
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
                  onChange={(e) => onUpdateRoom(index, { ...room, width: Number(e.target.value) })}
                  data-testid={`room-width-${room.id}`}
                />
              </label>
              <label>
                Depth (mm):
                <input
                  type="number"
                  value={room.depth}
                  onChange={(e) => onUpdateRoom(index, { ...room, depth: Number(e.target.value) })}
                  data-testid={`room-depth-${room.id}`}
                />
              </label>
            </div>
            <div>
              <label className="section-label">My Anchor:</label>
              <AnchorSelector
                value={room.anchor}
                onChange={(anchor) => onUpdateRoom(index, { ...room, anchor })}
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
                    onUpdateRoom(index, { ...room, attachTo: `${e.target.value}:${currentAnchor}` });
                  }}
                  data-testid={`room-attach-to-${room.id}`}
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
                      onUpdateRoom(index, { ...room, attachTo: `${roomId}:${anchor}` });
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
                  data-testid={`room-offset-x-${room.id}`}
                  value={room.offset?.[0] ?? 0}
                  onChange={(e) => {
                    const newOffset: [number, number] = [Number(e.target.value), room.offset?.[1] ?? 0];
                    onUpdateRoom(index, { ...room, offset: newOffset });
                  }}
                />
              </label>
              <label>
                Offset Y (mm):
                <input
                  type="number"
                  data-testid={`room-offset-y-${room.id}`}
                  value={room.offset?.[1] ?? 0}
                  onChange={(e) => {
                    const newOffset: [number, number] = [room.offset?.[0] ?? 0, Number(e.target.value)];
                    onUpdateRoom(index, { ...room, offset: newOffset });
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
                  <div className="dimensions-layout" style={{ marginTop: '10px' }}>
                    <div>
                      <label className="section-label">My Anchor:</label>
                      <AnchorSelector
                        value={part.anchor}
                        onChange={(anchor) => updateRoomPart(index, partIndex, { ...part, anchor })}
                      />
                    </div>
                  </div>
                  <div className="form-section" style={{ marginTop: '10px' }}>
                    <label className="section-label">Positioning</label>
                    <div className="form-grid">
                      <label>
                        Attach To:
                        <select
                          value={part.attachTo?.split(':')[0] || 'parent'}
                          onChange={(e) => {
                            const currentAnchor = part.attachTo?.split(':')[1] || 'bottom-left';
                            updateRoomPart(index, partIndex, { ...part, attachTo: `${e.target.value}:${currentAnchor}` });
                          }}
                        >
                          {partList.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </label>

                      <div>
                        <label className="section-label">Attach To Corner:</label>
                        <AnchorSelector
                          value={(part.attachTo?.split(':')[1] as Anchor) || 'bottom-left'}
                          onChange={(anchor) => {
                            const refId = part.attachTo?.split(':')[0] || 'parent';
                            updateRoomPart(index, partIndex, { ...part, attachTo: `${refId}:${anchor}` });
                          }}
                        />
                      </div>
                    </div>
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
              <button onClick={() => addRoomObject(index)} className="add-button-small" data-testid={`add-object-button-${room.id}`}>+ Add Object</button>
            </div>
            {(room.objects || []).map((obj, objIndex) => (
              <div key={objIndex} className="object-card" data-room-id={room.id} data-object-index={objIndex} data-testid={`object-card-${room.id}-${objIndex}`}>
                <div className="object-header">
                  <select
                    value={obj.type}
                    onChange={(e) => updateRoomObject(index, objIndex, { ...obj, type: e.target.value as 'square' | 'circle' })}
                    data-testid={`object-type-${room.id}-${objIndex}`}
                  >
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                  </select>
                  <button onClick={() => deleteRoomObject(index, objIndex)} className="delete-button-small" data-testid={`delete-object-button-${room.id}-${objIndex}`}>×</button>
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
                          data-testid={`object-width-${room.id}-${objIndex}`}
                          value={obj.width || 1000}
                          onChange={(e) => updateRoomObject(index, objIndex, { ...obj, width: Number(e.target.value) })}
                        />
                      </label>
                      <label>
                        Height:
                        <input
                          type="number"
                          data-testid={`object-height-${room.id}-${objIndex}`}
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
                        data-testid={`object-radius-${room.id}-${objIndex}`}
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
  );
}
