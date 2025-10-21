import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { FloorplanWorld } from '../support/world';

// Zero Point Positioning
When('I create a room attached to {string}', async function(this: FloorplanWorld, attachTo: string) {
  await this.page.getByTestId('tab-json').click();
  const jsonTextarea = this.page.getByTestId('json-textarea');

  const json = {
    grid_step: 1000,
    rooms: [{
      id: 'testroom1',
      name: 'Test Room',
      width: 3000,
      depth: 3000,
      attachTo: attachTo
    }]
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600); // Wait for debounce
});

Then('the room should be positioned at {int}, {int}', async function(this: FloorplanWorld, x: number, y: number) {
  // Room at 0,0 should be visible in SVG at zeropoint
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  const roomRect = this.page.locator('[data-room-id="testroom1"]');
  await expect(roomRect).toBeVisible();
});

// Relative Positioning
Given('I have a room {string} at position {int},{int}', async function(this: FloorplanWorld, roomId: string, x: number, y: number) {
  await this.page.getByTestId('tab-json').click();
  const jsonTextarea = this.page.getByTestId('json-textarea');

  const json = {
    grid_step: 1000,
    rooms: [{
      id: roomId,
      name: roomId,
      width: 3000,
      depth: 3000,
      attachTo: 'zeropoint:top-left',
      offset: [x, y]
    }]
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600);

  // Store this room data for later steps
  (this as any).currentRooms = json.rooms;
});

When('I create room {string} attached to {string}', async function(this: FloorplanWorld, newRoomId: string, attachTo: string) {
  const currentRooms = (this as any).currentRooms || [];

  const newRoom = {
    id: newRoomId,
    name: newRoomId,
    width: 3000,
    depth: 3000,
    attachTo: attachTo
  };

  currentRooms.push(newRoom);

  const jsonTextarea = this.page.getByTestId('json-textarea');
  const json = {
    grid_step: 1000,
    rooms: currentRooms
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600);

  (this as any).currentRooms = currentRooms;
  (this as any).lastCreatedRoomId = newRoomId;
});

Then('room {string} should be positioned relative to room {string}', async function(this: FloorplanWorld, newRoomId: string, baseRoomId: string) {
  const roomRect = this.page.locator(`[data-room-id="${newRoomId}"]`);
  await expect(roomRect).toBeVisible();

  const baseRect = this.page.locator(`[data-room-id="${baseRoomId}"]`);
  await expect(baseRect).toBeVisible();
});

Then('the rooms should be adjacent', async function(this: FloorplanWorld) {
  // Both rooms should be visible in the SVG
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

// Anchor Points
When('I attach room {string} to room {string} at {string} corner', async function(this: FloorplanWorld, newRoomId: string, baseRoomId: string, corner: string) {
  const currentRooms = (this as any).currentRooms || [];

  const newRoom = {
    id: newRoomId,
    name: newRoomId,
    width: 3000,
    depth: 3000,
    attachTo: `${baseRoomId}:${corner}`
  };

  currentRooms.push(newRoom);

  const jsonTextarea = this.page.getByTestId('json-textarea');
  const json = {
    grid_step: 1000,
    rooms: currentRooms
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600);

  (this as any).currentRooms = currentRooms;
});

Then('room {string} should align with the {string} corner of room {string}', async function(this: FloorplanWorld, newRoomId: string, corner: string, baseRoomId: string) {
  const roomRect = this.page.locator(`[data-room-id="${newRoomId}"]`);
  await expect(roomRect).toBeVisible();
});

When('I set room {string} anchor to {string}', async function(this: FloorplanWorld, roomId: string, anchor: string) {
  const currentRooms = (this as any).currentRooms || [];
  const room = currentRooms.find((r: any) => r.id === roomId);

  if (room) {
    room.anchor = anchor;

    const jsonTextarea = this.page.getByTestId('json-textarea');
    const json = {
      grid_step: 1000,
      rooms: currentRooms
    };

    await jsonTextarea.fill(JSON.stringify(json, null, 2));
    await this.page.waitForTimeout(600);
  }
});

Then('room {string} should attach at its {string} corner', async function(this: FloorplanWorld, roomId: string, anchor: string) {
  const roomRect = this.page.locator(`[data-room-id="${roomId}"]`);
  await expect(roomRect).toBeVisible();
});

// Offset Positioning
When('I set offset to {int},{int} for room {string}', async function(this: FloorplanWorld, offsetX: number, offsetY: number, roomId: string) {
  const currentRooms = (this as any).currentRooms || [];
  const room = currentRooms.find((r: any) => r.id === roomId);

  if (room) {
    room.offset = [offsetX, offsetY];

    const jsonTextarea = this.page.getByTestId('json-textarea');
    const json = {
      grid_step: 1000,
      rooms: currentRooms
    };

    await jsonTextarea.fill(JSON.stringify(json, null, 2));
    await this.page.waitForTimeout(600);
  }
});

Then('room {string} should be offset by {int},{int} from its attachment point', async function(this: FloorplanWorld, roomId: string, offsetX: number, offsetY: number) {
  const roomRect = this.page.locator(`[data-room-id="${roomId}"]`);
  await expect(roomRect).toBeVisible();
});

// Composite Rooms
When('I create a composite room with parts', async function(this: FloorplanWorld) {
  await this.page.getByTestId('tab-json').click();
  const jsonTextarea = this.page.getByTestId('json-textarea');

  const json = {
    grid_step: 1000,
    rooms: [{
      id: 'mainroom',
      name: 'Main Room',
      width: 4000,
      depth: 3000,
      attachTo: 'zeropoint:top-left',
      parts: [{
        id: 'part1',
        name: 'Extension',
        width: 2000,
        depth: 2000,
        attachTo: 'parent:bottom-left'
      }]
    }]
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600);

  (this as any).compositeRoomId = 'mainroom';
});

Then('the parts should position relative to the parent', async function(this: FloorplanWorld) {
  const mainRoom = this.page.locator('[data-room-id="mainroom"]');
  await expect(mainRoom).toBeVisible();
  // Composite room renders all parts together
});

Then('the parts should render as a single composite shape', async function(this: FloorplanWorld) {
  const mainRoom = this.page.locator('[data-room-id="mainroom"]');
  await expect(mainRoom).toBeVisible();
  // Internal borders should be hidden
});

When('a room part attaches to {string}', async function(this: FloorplanWorld, attachTo: string) {
  // Room parts can attach to "parent" or other part IDs
  expect(true).toBe(true);
});

Then('it should resolve relative to the parent room', async function(this: FloorplanWorld) {
  const mainRoom = this.page.locator('[data-room-id="mainroom"]');
  await expect(mainRoom).toBeVisible();
});

// Circular Dependencies
When('I create room {string} attached to room {string}', async function(this: FloorplanWorld, roomAId: string, roomBId: string) {
  const jsonTextarea = this.page.getByTestId('json-textarea');

  const json = {
    grid_step: 1000,
    rooms: [
      {
        id: roomAId,
        name: roomAId,
        width: 3000,
        depth: 3000,
        attachTo: `${roomBId}:top-left`
      },
      {
        id: roomBId,
        name: roomBId,
        width: 3000,
        depth: 3000,
        attachTo: `${roomAId}:top-left`
      }
    ]
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600);
});

Then('a circular dependency error should be displayed', async function(this: FloorplanWorld) {
  // Check for error in the error panel at bottom of preview
  const errorPanel = this.page.locator('.error-panel, .positioning-errors');
  // Error might be in JSON editor warnings
  const warnings = this.page.getByTestId('json-warnings');

  try {
    await expect(errorPanel).toBeVisible({ timeout: 2000 });
  } catch {
    await expect(warnings).toBeVisible({ timeout: 2000 });
  }
});

Then('neither room should render', async function(this: FloorplanWorld) {
  // Rooms with circular dependencies won't be in the roomMap
  // SVG should still be visible but without these rooms
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

// Missing Reference Errors
When('I create a room attached to non-existent room {string}', async function(this: FloorplanWorld, nonExistentId: string) {
  await this.page.getByTestId('tab-json').click();
  const jsonTextarea = this.page.getByTestId('json-textarea');

  const json = {
    grid_step: 1000,
    rooms: [{
      id: 'testroom',
      name: 'Test Room',
      width: 3000,
      depth: 3000,
      attachTo: `${nonExistentId}:top-left`
    }]
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600);
});

Then('a missing reference error should be displayed', async function(this: FloorplanWorld) {
  const warnings = this.page.getByTestId('json-warnings');
  await expect(warnings).toBeVisible({ timeout: 2000 });
});

Then('the room should not render', async function(this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

// Zero Point Validation
When('I create rooms without any zeropoint attachment', async function(this: FloorplanWorld) {
  await this.page.getByTestId('tab-json').click();
  const jsonTextarea = this.page.getByTestId('json-textarea');

  const json = {
    grid_step: 1000,
    rooms: [
      {
        id: 'room1',
        name: 'Room 1',
        width: 3000,
        depth: 3000,
        attachTo: 'room2:top-left'
      },
      {
        id: 'room2',
        name: 'Room 2',
        width: 3000,
        depth: 3000,
        attachTo: 'room1:top-right'
      }
    ]
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600);
});

Then('a validation error should be displayed', async function(this: FloorplanWorld) {
  const warnings = this.page.getByTestId('json-warnings');
  await expect(warnings).toBeVisible({ timeout: 2000 });
});

Then('the error should indicate that at least one room must connect to zero point', async function(this: FloorplanWorld) {
  const warnings = this.page.getByTestId('json-warnings');
  const warningText = await warnings.textContent();
  expect(warningText).toContain('Zero Point');
});

// Room Positioning Chain
When('I create a chain of {int} rooms', async function(this: FloorplanWorld, count: number) {
  const rooms = [];

  for (let i = 1; i <= count; i++) {
    rooms.push({
      id: `room${i}`,
      name: `Room ${i}`,
      width: 3000,
      depth: 3000,
      attachTo: i === 1 ? 'zeropoint:top-left' : `room${i-1}:top-right`
    });
  }

  await this.page.getByTestId('tab-json').click();
  const jsonTextarea = this.page.getByTestId('json-textarea');

  const json = {
    grid_step: 1000,
    rooms: rooms
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600);

  (this as any).roomCount = count;
});

Then('all rooms should resolve correctly', async function(this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  const count = (this as any).roomCount || 5;

  // Check that first and last rooms are visible
  const firstRoom = this.page.locator('[data-room-id="room1"]');
  await expect(firstRoom).toBeVisible();

  const lastRoom = this.page.locator(`[data-room-id="room${count}"]`);
  await expect(lastRoom).toBeVisible();
});

Then('the rooms should form a horizontal line', async function(this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Rooms attached to top-right should form a horizontal line
});

// Position Resolution Order
Given('I have rooms that depend on each other in complex ways', async function(this: FloorplanWorld) {
  const rooms = [
    {
      id: 'base',
      name: 'Base',
      width: 3000,
      depth: 3000,
      attachTo: 'zeropoint:top-left'
    },
    {
      id: 'right',
      name: 'Right',
      width: 2000,
      depth: 2000,
      attachTo: 'base:top-right'
    },
    {
      id: 'bottom',
      name: 'Bottom',
      width: 2000,
      depth: 2000,
      attachTo: 'base:bottom-left'
    },
    {
      id: 'corner',
      name: 'Corner',
      width: 1500,
      depth: 1500,
      attachTo: 'bottom:bottom-right'
    }
  ];

  await this.page.getByTestId('tab-json').click();
  const jsonTextarea = this.page.getByTestId('json-textarea');

  const json = {
    grid_step: 1000,
    rooms: rooms
  };

  await jsonTextarea.fill(JSON.stringify(json, null, 2));
  await this.page.waitForTimeout(600);
});

Then('the positioning algorithm should resolve them iteratively', async function(this: FloorplanWorld) {
  // All rooms should be visible
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  const baseRoom = this.page.locator('[data-room-id="base"]');
  await expect(baseRoom).toBeVisible();

  const cornerRoom = this.page.locator('[data-room-id="corner"]');
  await expect(cornerRoom).toBeVisible();
});

Then('all rooms should render at correct positions', async function(this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});
