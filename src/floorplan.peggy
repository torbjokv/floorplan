{{
  // Helper functions for the parser
  function extractList(head, tail) {
    return [head, ...tail.map(t => t[1])];
  }

  function buildRoom(id, label, dimensions, anchor, attachInfo, offset, children) {
    const room = {
      id: id.toLowerCase(),
      width: dimensions.width,
      depth: dimensions.depth,
      attachTo: `${attachInfo.target}:${attachInfo.anchor}`
    };

    if (label) {
      room.name = label;
    }

    if (anchor) {
      room.anchor = anchor;
    }

    if (offset) {
      room.offset = offset;
    }

    // Process children
    const parts = [];
    const objects = [];

    children.forEach(child => {
      if (child.type === 'part') {
        parts.push(child.data);
      } else if (child.type === 'object') {
        objects.push(child.data);
      }
    });

    if (parts.length > 0) {
      room.parts = parts;
    }

    if (objects.length > 0) {
      room.objects = objects;
    }

    return room;
  }

  function buildPart(id, label, dimensions, anchor, attachInfo, offset, children) {
    const part = {
      id: id.toLowerCase(),
      width: dimensions.width,
      depth: dimensions.depth,
      attachTo: `${attachInfo.target}:${attachInfo.anchor}`
    };

    if (label) {
      part.name = label;
    }

    if (anchor) {
      part.anchor = anchor;
    }

    if (offset) {
      part.offset = offset;
    }

    const objects = children.filter(c => c.type === 'object').map(c => c.data);

    if (objects.length > 0) {
      part.objects = objects;
    }

    return part;
  }
}}

// Main entry point
FloorPlan
  = _ grid:GridSetting? _ items:ItemList? _ {
      const result = { rooms: [] };

      if (grid) {
        result.grid_step = grid;
      }

      // Separate rooms, doors, windows, and objects
      const doors = [];
      const windows = [];
      const objects = [];

      if (items) {
        items.forEach(item => {
          if (item.type === 'room') {
            result.rooms.push(item.room);
            if (item.doors) doors.push(...item.doors);
            if (item.windows) windows.push(...item.windows);
          } else if (item.type === 'door') {
            doors.push(item.data);
          } else if (item.type === 'window') {
            windows.push(item.data);
          } else if (item.type === 'object') {
            objects.push(item.data);
          }
        });
      }

      if (doors.length > 0) {
        result.doors = doors;
      }

      if (windows.length > 0) {
        result.windows = windows;
      }

      if (objects.length > 0) {
        result.objects = objects;
      }

      return result;
    }

// Grid setting
GridSetting
  = "grid"i _ step:Integer {
      return step;
    }

// Item list (rooms, doors, windows at top level)
ItemList
  = head:Item tail:(_ Item)* {
      return extractList(head, tail);
    }

// Item can be a room, freestanding door, window, or object
Item
  = RoomDefinition
  / FreestandingDoor
  / FreestandingWindow
  / FreestandingObject

// Freestanding door (no indent, positioned relative to zeropoint/room or absolutely)
FreestandingDoor
  = "door"i _ width:Integer _ swing:Swing? _ "at"i _ coords:Offset {
      // Absolute positioning with (x, y)
      const door = {
        width,
        swing: swing || 'inwards-left',
        x: coords[0],
        y: coords[1],
        rotation: 0
      };

      if (swing === 'opening') {
        door.type = 'opening';
        delete door.swing;
      } else {
        door.type = 'normal';
      }

      return {
        type: 'door',
        data: door
      };
    }
  / "door"i _ width:Integer _ swing:Swing? _ "at"i _ target:FreestandingTarget ___ offset:Offset? {
      // Wall-attached positioning
      const door = {
        room: target,
        width,
        swing: swing || 'inwards-left'
      };

      if (swing === 'opening') {
        door.type = 'opening';
        delete door.swing;
      } else {
        door.type = 'normal';
      }

      if (offset) {
        door.offset = offset[0];
      }

      return {
        type: 'door',
        data: door
      };
    }

// Freestanding window (no indent, positioned relative to zeropoint/room or absolutely)
FreestandingWindow
  = "window"i _ width:Integer _ "at"i _ coords:Offset {
      // Absolute positioning with (x, y)
      return {
        type: 'window',
        data: {
          width,
          x: coords[0],
          y: coords[1],
          rotation: 0
        }
      };
    }
  / "window"i _ width:Integer _ "at"i _ target:FreestandingTarget ___ offset:Offset? {
      // Wall-attached positioning
      return {
        type: 'window',
        data: {
          room: target,
          width,
          offset: offset?.[0] || 0
        }
      };
    }

// Freestanding object (no indent, positioned at absolute coordinates)
FreestandingObject
  = "object"i _ objType:ObjectType _ label:Label? _ dims:ObjectDimensions ___ color:Color? ___ "at"i _ offset:Offset {
      const obj = {
        type: objType,
        x: offset[0],
        y: offset[1],
        width: dims.width,
        height: objType === 'square' ? dims.height : undefined,
        anchor: 'top-left',
        roomAnchor: 'top-left',
        color: color || '#33d17a'
      };

      if (label) {
        obj.text = label;
      }

      return {
        type: 'object',
        data: obj
      };
    }

// Target for freestanding elements (roomId:wall or zeropoint:wall)
FreestandingTarget
  = target:Identifier ":" wall:Wall {
      return `${target.toLowerCase()}:${wall}`;
    }
  / "zeropoint"i ":" wall:Wall {
      return `zeropoint:${wall}`;
    }

// Room list (deprecated, kept for backwards compatibility)
RoomList
  = head:RoomDefinition tail:(_ RoomDefinition)* {
      return extractList(head, tail);
    }

// Room "at" clause - can be "at Target (offset)" or "at (offset)" for implicit zeropoint
RoomAtClause
  = "at"i _ attach:AttachTo __ offset:Offset? { return { attach, offset }; }
  / "at"i _ offset:Offset { return { attach: { target: 'zeropoint', anchor: 'top-left' }, offset }; }

// Room definition
RoomDefinition
  = "room"i _ id:Identifier _ label:Label? _ dims:Dimensions positioning:(__ anchor:Anchor? __ atClause:RoomAtClause? { return { anchor, atClause }; })? children:RoomChildren? {
      const roomId = id.toLowerCase();

      // Extract positioning info or use defaults
      const anchor = positioning?.anchor || null;
      const atClause = positioning?.atClause || null;

      // Default to zeropoint if no at clause provided
      const attach = atClause ? atClause.attach : { target: 'zeropoint', anchor: 'top-left' };
      const offset = atClause?.offset || null;

      const room = buildRoom(id, label, dims, anchor, attach, offset, children?.children || []);

      // Replace room ID placeholders in doors and windows
      const doors = (children?.doors || []).map(door => {
        if (door && door.room) {
          return {
            ...door,
            room: door.room.replace('{ROOM_ID}', roomId)
          };
        }
        return door;
      }).filter(d => d);

      const windows = (children?.windows || []).map(window => {
        if (window && window.room) {
          return {
            ...window,
            room: window.room.replace('{ROOM_ID}', roomId)
          };
        }
        return window;
      }).filter(w => w);

      return {
        type: 'room',
        room,
        doors,
        windows
      };
    }

// Room children (parts, doors, windows, objects)
RoomChildren
  = EOL items:(RoomChildItem EOL*)+ {
      const children = [];
      const doors = [];
      const windows = [];

      items.forEach(([item]) => {
        if (item.type === 'part') {
          children.push(item);
          if (item.doors) doors.push(...item.doors);
          if (item.windows) windows.push(...item.windows);
        } else if (item.type === 'door') {
          doors.push(item.data);
        } else if (item.type === 'window') {
          windows.push(item.data);
        } else if (item.type === 'object') {
          children.push(item);
        }
      });

      return { children, doors, windows };
    }

RoomChildItem
  = PartDefinition
  / WindowDefinition
  / DoorDefinition
  / ObjectDefinition

// Part definition (single indent - room-level child)
PartDefinition
  = SingleIndent "part"i _ id:Identifier _ label:Label? _ dims:Dimensions _ anchor:Anchor? _ "at"i _ attach:PartAttachTo __ offset:Offset? children:PartChildren? {
      const partId = id.toLowerCase();
      const target = attach.target === 'room' ? 'parent' : attach.target.toLowerCase();
      const attachInfo = { target, anchor: attach.anchor };

      // Convert children.objects array into proper format for buildPart
      const childrenForBuild = (children?.objects || []).map(obj => ({ type: 'object', data: obj }));
      const part = buildPart(id, label, dims, anchor, attachInfo, offset, childrenForBuild);

      // Replace part ID placeholders in doors and windows
      const doors = (children?.doors || []).map(door => {
        if (door && door.room) {
          return {
            ...door,
            room: door.room.replace('{ROOM_ID}', partId)
          };
        }
        return door;
      }).filter(d => d);

      const windows = (children?.windows || []).map(window => {
        if (window && window.room) {
          return {
            ...window,
            room: window.room.replace('{ROOM_ID}', partId)
          };
        }
        return window;
      }).filter(w => w);

      return {
        type: 'part',
        data: part,
        doors,
        windows
      };
    }

// Part children (doors, windows, objects - no nested parts)
PartChildren
  = EOL items:(PartChildItem EOL*)+ {
      const objects = [];
      const doors = [];
      const windows = [];

      items.forEach(([item]) => {
        if (item.type === 'door') {
          doors.push(item.data);
        } else if (item.type === 'window') {
          windows.push(item.data);
        } else if (item.type === 'object') {
          objects.push(item.data);
        }
      });

      return { objects, doors, windows };
    }

PartChildItem
  = PartWindowDefinition
  / PartDoorDefinition
  / PartObjectDefinition

// Window definition for parts (double indent)
PartWindowDefinition
  = DoubleIndent "window"i _ width:Integer _ "at"i _ wall:Wall __ offset:Offset? {
      return {
        type: 'window',
        data: {
          room: `{ROOM_ID}:${wall}`,
          width,
          offset: offset?.[0] || 0
        }
      };
    }

// Door definition for parts (double indent)
PartDoorDefinition
  = DoubleIndent "door"i _ width:Integer _ swing:Swing? _ "at"i _ wall:Wall __ offset:Offset? {
      const door = {
        room: `{ROOM_ID}:${wall}`,
        width,
        swing: swing || 'inwards-left'
      };

      if (swing === 'opening') {
        door.type = 'opening';
        delete door.swing;
      } else {
        door.type = 'normal';
      }

      if (offset) {
        door.offset = offset[0];
      }

      return {
        type: 'door',
        data: door
      };
    }

// Object definition for parts (double indent)
PartObjectDefinition
  = DoubleIndent "object"i _ objType:ObjectType _ label:Label? _ dims:ObjectDimensions ___ color:Color? ___ atClause:ObjectAtClause? {
      const anchor = atClause?.anchor || 'top-left';
      const offset = atClause?.offset;

      const obj = {
        type: objType,
        anchor: anchor,
        roomAnchor: anchor
      };

      if (objType === 'square') {
        obj.width = dims.width;
        obj.height = dims.height;
      } else if (objType === 'circle') {
        obj.width = dims.width;
      }

      if (label) {
        obj.text = label;
      }

      if (color) {
        obj.color = color;
      }

      if (offset) {
        obj.x = offset[0];
        obj.y = offset[1];
      } else {
        obj.x = 0;
        obj.y = 0;
      }

      return {
        type: 'object',
        data: obj
      };
    }

// Window definition (for rooms - single indent)
WindowDefinition
  = SingleIndent "window"i _ width:Integer _ "at"i _ wall:Wall __ offset:Offset? {
      return {
        type: 'window',
        data: {
          room: `{ROOM_ID}:${wall}`,
          width,
          offset: offset?.[0] || 0
        }
      };
    }

// Door definition (for rooms - single indent)
DoorDefinition
  = SingleIndent "door"i _ width:Integer _ swing:Swing? _ "at"i _ wall:Wall __ offset:Offset? {
      const door = {
        room: `{ROOM_ID}:${wall}`,
        width,
        swing: swing || 'inwards-left'
      };

      if (swing === 'opening') {
        door.type = 'opening';
        delete door.swing;
      } else {
        door.type = 'normal';
      }

      if (offset) {
        door.offset = offset[0];
      }

      return {
        type: 'door',
        data: door
      };
    }

// Object definition (for rooms - single indent)
ObjectDefinition
  = SingleIndent "object"i _ objType:ObjectType _ label:Label? _ dims:ObjectDimensions ___ color:Color? ___ atClause:ObjectAtClause? {
      const anchor = atClause?.anchor || 'top-left';
      const offset = atClause?.offset;

      const obj = {
        type: objType,
        anchor: anchor,
        roomAnchor: anchor
      };

      if (objType === 'square') {
        obj.width = dims.width;
        obj.height = dims.height;
      } else if (objType === 'circle') {
        obj.width = dims.width; // For circles, width is the diameter
      }

      if (label) {
        obj.text = label;
      }

      if (color) {
        obj.color = color;
      }

      if (offset) {
        obj.x = offset[0];
        obj.y = offset[1];
      } else {
        obj.x = 0;
        obj.y = 0;
      }

      return {
        type: 'object',
        data: obj
      };
    }

// Object "at" clause (anchor and/or offset)
ObjectAtClause
  = "at"i _ anchor:Anchor __ offset:Offset { return { anchor, offset }; }
  / "at"i _ offset:Offset { return { anchor: 'top-left', offset }; }
  / "at"i _ anchor:Anchor ![ \t] { return { anchor, offset: null }; } // No horizontal space = end of clause

// Primitives
Identifier
  = first:[a-zA-Z] rest:[a-zA-Z0-9_]* { return first + rest.join(''); }

Label
  = '"' chars:[^"]* '"' { return chars.join(''); }
  / "'" chars:[^']* "'" { return chars.join(''); }

Dimensions
  = width:Integer "x" depth:Integer { return { width, depth }; }

ObjectDimensions
  = width:Integer "x" height:Integer { return { width, height }; }
  / width:Integer { return { width }; }

Anchor
  = "top-left"i { return 'top-left'; }
  / "top-right"i { return 'top-right'; }
  / "bottom-left"i { return 'bottom-left'; }
  / "bottom-right"i { return 'bottom-right'; }

AttachTo
  = "zeropoint"i anchor:(":" Anchor)? {
      return { target: 'zeropoint', anchor: anchor ? anchor[1] : 'top-left' };
    }
  / target:Identifier anchor:(":" Anchor)? {
      return { target: target.toLowerCase(), anchor: anchor ? anchor[1] : 'bottom-right' };
    }

PartAttachTo
  = "room"i anchor:(":" Anchor)? {
      return { target: 'room', anchor: anchor ? anchor[1] : 'bottom-right' };
    }
  / target:Identifier anchor:(":" Anchor)? {
      return { target: target.toLowerCase(), anchor: anchor ? anchor[1] : 'bottom-right' };
    }

Offset
  = "(" _ x:Integer _ "," _ y:Integer _ ")" { return [x, y]; }
  / "(" _ offset:Integer _ ")" { return [offset]; }

Wall
  = "top"i { return 'top'; }
  / "bottom"i { return 'bottom'; }
  / "left"i { return 'left'; }
  / "right"i { return 'right'; }

Swing
  = "inwards-left"i { return 'inwards-left'; }
  / "inwards-right"i { return 'inwards-right'; }
  / "outwards-left"i { return 'outwards-left'; }
  / "outwards-right"i { return 'outwards-right'; }
  / "opening"i { return 'opening'; }

ObjectType
  = "square"i { return 'square'; }
  / "circle"i { return 'circle'; }

Color
  = "#" hex:[0-9a-fA-F]+ { return '#' + hex.join(''); }

Integer
  = sign:"-"? digits:[0-9]+ { return parseInt((sign || '') + digits.join(''), 10); }

// Whitespace and comments
_
  = (Whitespace / Comment / EOL)*

__
  = (Whitespace / Comment)*

___
  = Whitespace*

Whitespace
  = [ \t]+

Indent
  = [ \t]+

// Single indent for room-level children (at least 1 space/tab, but not too much)
SingleIndent
  = [ \t][ \t]?[ \t]?[ \t]? ![ \t]

// Double indent for part-level children (more indentation than single)
DoubleIndent
  = [ \t][ \t][ \t][ \t]+

Comment
  = "#" [^\n\r]*

EOL
  = "\r\n" / "\n" / "\r"
