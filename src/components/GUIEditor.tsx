import { useState, useEffect } from 'react';
import type { FloorplanData, Room, Door, Window } from '../types';
import { RoomEditor, DoorEditor, WindowEditor, GridSettings } from './gui-editor';
import './GUIEditor.css';

// Constants
const DEFAULT_ROOM_SIZE = 3000; // mm
const DEFAULT_DOOR_WIDTH = 800; // mm
const DEFAULT_DOOR_OFFSET = 1000; // mm
const DEFAULT_WINDOW_WIDTH = 1200; // mm
const DEFAULT_WINDOW_OFFSET = 1000; // mm

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

  // Get list of rooms for dropdowns (show name, use ID)
  // Add Zero Point as first option
  const roomList = [
    { id: 'zeropoint', name: '⚫ Zero Point (0,0)' },
    ...localData.rooms.map(r => ({ id: r.id, name: r.name || r.id }))
  ];

  return (
    <div className="gui-editor">
      <RoomEditor
        rooms={localData.rooms}
        roomList={roomList}
        onAddRoom={addRoom}
        onUpdateRoom={updateRoom}
        onDeleteRoom={deleteRoom}
        generateRoomId={generateRoomId}
      />

      <DoorEditor
        doors={localData.doors || []}
        rooms={localData.rooms}
        roomList={roomList}
        onAddDoor={addDoor}
        onUpdateDoor={updateDoor}
        onDeleteDoor={deleteDoor}
      />

      <WindowEditor
        windows={localData.windows || []}
        rooms={localData.rooms}
        roomList={roomList}
        onAddWindow={addWindow}
        onUpdateWindow={updateWindow}
        onDeleteWindow={deleteWindow}
      />

      <GridSettings
        gridStep={localData.grid_step}
        onGridStepChange={updateGridStep}
      />
    </div>
  );
}
