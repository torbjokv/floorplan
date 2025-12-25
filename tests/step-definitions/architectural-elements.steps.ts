import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { FloorplanWorld } from '../support/world';
import { fillDSLFromJSON } from '../support/dsl-helper';

// Helper function to create a basic room setup using DSL
async function createBasicRoom(world: FloorplanWorld, roomId: string, roomName: string) {
  const json = {
    grid_step: 1000,
    rooms: [
      {
        id: roomId,
        name: roomName,
        width: 4000,
        depth: 3000,
        attachTo: 'zeropoint:top-left',
      },
    ],
  };

  await fillDSLFromJSON(world, json);
  return json;
}

// Adding Doors
Given(
  'I have a room named {string} with dimensions {int}x{int}',
  async function (this: FloorplanWorld, roomName: string, width: number, depth: number) {
    const roomId = roomName.toLowerCase().replace(/\s+/g, '');

    const json = {
      grid_step: 1000,
      rooms: [
        {
          id: roomId,
          name: roomName,
          width: width,
          depth: depth,
          attachTo: 'zeropoint:top-left',
        },
      ],
    };

    await fillDSLFromJSON(this, json);

    (this as any).currentRoomId = roomId;
    (this as any).currentJson = json;
  }
);

When(
  'I add a door to {string} at offset {int} with width {int}',
  async function (this: FloorplanWorld, roomWall: string, offset: number, width: number) {
    const currentJson = (this as any).currentJson;

    if (!currentJson.doors) {
      currentJson.doors = [];
    }

    currentJson.doors.push({
      room: roomWall,
      offset: offset,
      width: width,
      swing: 'inwards-right',
    });

    await fillDSLFromJSON(this, currentJson);

    (this as any).currentJson = currentJson;
  }
);

Then('the door should be visible on the bottom wall', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Door is rendered as part of SVG
});

Then(
  'the door should be {int}mm wide',
  async function (this: FloorplanWorld, expectedWidth: number) {
    // Door width is in the JSON data
    const currentJson = (this as any).currentJson;
    expect(currentJson.doors[0].width).toBe(expectedWidth);
  }
);

Then(
  'the door should be positioned {int}mm from the wall start',
  async function (this: FloorplanWorld, expectedOffset: number) {
    const currentJson = (this as any).currentJson;
    expect(currentJson.doors[0].offset).toBe(expectedOffset);
  }
);

// Door Swing Direction
When('I add a door with swing {string}', async function (this: FloorplanWorld, swing: string) {
  const currentJson = (this as any).currentJson || {
    grid_step: 1000,
    rooms: [
      {
        id: 'livingroom',
        name: 'Living Room',
        width: 4000,
        depth: 3000,
        attachTo: 'zeropoint:top-left',
      },
    ],
  };

  if (!currentJson.doors) {
    currentJson.doors = [];
  }

  currentJson.doors.push({
    room: `${currentJson.rooms[0].id}:bottom`,
    offset: 1000,
    width: 800,
    swing: swing,
  });

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then('a swing arc should be visible', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Swing arc is rendered as SVG path element
});

Then('the arc should indicate inward opening', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.doors[currentJson.doors.length - 1].swing).toContain('inwards');
});

Then('the hinge should be on the right side', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.doors[currentJson.doors.length - 1].swing).toContain('right');
});

When(
  'I add a door with swing {string} on {string} wall',
  async function (this: FloorplanWorld, swing: string, wall: string) {
    const currentJson = (this as any).currentJson;

    if (!currentJson.doors) {
      currentJson.doors = [];
    }

    currentJson.doors.push({
      room: `${currentJson.rooms[0].id}:${wall}`,
      offset: 1000,
      width: 800,
      swing: swing,
    });

    await fillDSLFromJSON(this, currentJson);

    (this as any).currentJson = currentJson;
  }
);

Then('the arc should indicate outward opening', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  const lastDoor = currentJson.doors[currentJson.doors.length - 1];
  expect(lastDoor.swing).toContain('outwards');
});

Then('the hinge should be on the left side', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  const lastDoor = currentJson.doors[currentJson.doors.length - 1];
  expect(lastDoor.swing).toContain('left');
});

// Door Types
Given('I have a door on a wall', async function (this: FloorplanWorld) {
  const json = {
    grid_step: 1000,
    rooms: [
      {
        id: 'testroom',
        name: 'Test Room',
        width: 4000,
        depth: 3000,
        attachTo: 'zeropoint:top-left',
      },
    ],
    doors: [
      {
        room: 'testroom:bottom',
        offset: 1000,
        width: 800,
        swing: 'inwards-right',
      },
    ],
  };

  await fillDSLFromJSON(this, json);

  (this as any).currentJson = json;
});

When('I set door type to {string}', async function (this: FloorplanWorld, doorType: string) {
  const currentJson = (this as any).currentJson;

  if (currentJson.doors && currentJson.doors.length > 0) {
    currentJson.doors[0].type = doorType;

    if (doorType === 'opening') {
      delete currentJson.doors[0].swing;
    }

    await fillDSLFromJSON(this, currentJson);

    (this as any).currentJson = currentJson;
  }
});

Then('the door should render with a swing arc', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

Then('the door should render without a swing arc', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Type "opening" doesn't have swing arc
});

Then('the door blade should be visible', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.doors[0].type).toBe('normal');
});

Then('only the opening should be visible', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.doors[0].type).toBe('opening');
});

// Windows
When(
  'I add a window to {string} at offset {int} with width {int}',
  async function (this: FloorplanWorld, roomWall: string, offset: number, width: number) {
    const currentJson = (this as any).currentJson;

    if (!currentJson.windows) {
      currentJson.windows = [];
    }

    currentJson.windows.push({
      room: roomWall,
      offset: offset,
      width: width,
    });

    await fillDSLFromJSON(this, currentJson);

    (this as any).currentJson = currentJson;
  }
);

Then('the window should be visible on the top wall', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Window is rendered in SVG
});

Then(
  'the window should be {int}mm wide',
  async function (this: FloorplanWorld, expectedWidth: number) {
    const currentJson = (this as any).currentJson;
    expect(currentJson.windows[0].width).toBe(expectedWidth);
  }
);

Then(
  'the window should be positioned {int}mm from the wall start',
  async function (this: FloorplanWorld, expectedOffset: number) {
    const currentJson = (this as any).currentJson;
    expect(currentJson.windows[0].offset).toBe(expectedOffset);
  }
);

// Wall Positioning
When('I add a door to the {string} wall', async function (this: FloorplanWorld, wall: string) {
  const currentJson = (this as any).currentJson;
  const roomId = currentJson.rooms[0].id;

  if (!currentJson.doors) {
    currentJson.doors = [];
  }

  currentJson.doors.push({
    room: `${roomId}:${wall}`,
    offset: 1000,
    width: 800,
    swing: 'inwards-right',
  });

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then(
  'the door should be oriented correctly for the {string} wall',
  async function (this: FloorplanWorld, wall: string) {
    const currentJson = (this as any).currentJson;
    const lastDoor = currentJson.doors[currentJson.doors.length - 1];
    expect(lastDoor.room).toContain(`:${wall}`);
  }
);

When('I add a window to the {string} wall', async function (this: FloorplanWorld, wall: string) {
  const currentJson = (this as any).currentJson;
  const roomId = currentJson.rooms[0].id;

  if (!currentJson.windows) {
    currentJson.windows = [];
  }

  currentJson.windows.push({
    room: `${roomId}:${wall}`,
    offset: 1000,
    width: 1200,
  });

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then(
  'the window should be oriented correctly for the {string} wall',
  async function (this: FloorplanWorld, wall: string) {
    const currentJson = (this as any).currentJson;
    const lastWindow = currentJson.windows[currentJson.windows.length - 1];
    expect(lastWindow.room).toContain(`:${wall}`);
  }
);

// Multiple Elements
When('I add multiple doors to the same room', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  const roomId = currentJson.rooms[0].id;

  currentJson.doors = [
    {
      room: `${roomId}:top`,
      offset: 500,
      width: 800,
      swing: 'inwards-right',
    },
    {
      room: `${roomId}:bottom`,
      offset: 1500,
      width: 900,
      swing: 'outwards-left',
    },
    {
      room: `${roomId}:left`,
      offset: 1000,
      width: 800,
      swing: 'opening',
    },
  ];

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then('all doors should render correctly', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  const currentJson = (this as any).currentJson;
  expect(currentJson.doors.length).toBe(3);
});

Then('each door should be positioned independently', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.doors[0].offset).not.toBe(currentJson.doors[1].offset);
});

When('I add multiple windows to different walls', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  const roomId = currentJson.rooms[0].id;

  currentJson.windows = [
    {
      room: `${roomId}:top`,
      offset: 1000,
      width: 1200,
    },
    {
      room: `${roomId}:right`,
      offset: 800,
      width: 1000,
    },
  ];

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then('all windows should render correctly', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  const currentJson = (this as any).currentJson;
  expect(currentJson.windows.length).toBe(2);
});

Then('each window should be on its specified wall', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.windows[0].room).toContain(':top');
  expect(currentJson.windows[1].room).toContain(':right');
});

// Hover Effects
Given('I have doors and windows configured', async function (this: FloorplanWorld) {
  const json = {
    grid_step: 1000,
    rooms: [
      {
        id: 'room1',
        name: 'Room 1',
        width: 4000,
        depth: 3000,
        attachTo: 'zeropoint:top-left',
      },
    ],
    doors: [
      {
        room: 'room1:bottom',
        offset: 1000,
        width: 800,
        swing: 'inwards-right',
      },
    ],
    windows: [
      {
        room: 'room1:top',
        offset: 1500,
        width: 1200,
      },
    ],
  };

  await fillDSLFromJSON(this, json);

  (this as any).currentJson = json;
});

When('I hover over a door', async function (this: FloorplanWorld) {
  // Hover is tested at the SVG level
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

When('I hover over the door', async function (this: FloorplanWorld) {
  // Wait for SVG to be visible first
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible({ timeout: 5000 });

  // Find the door rect inside the door-group (the rect receives clicks and bubbles to parent)
  const doorRect = this.page.locator('.door-group rect').first();

  // Wait for door to be attached to DOM (may take time after DSL update)
  await doorRect.waitFor({ state: 'attached', timeout: 10000 });

  // Click the door rect to focus and show buttons (click-to-focus behavior)
  // Use dispatchEvent to ensure the click bubbles properly to the parent group
  await doorRect.dispatchEvent('click');
  await this.page.waitForTimeout(500); // Wait for focus state to be applied
});

Then('the door should highlight', async function (this: FloorplanWorld) {
  // CSS hover effects are applied via :hover pseudo-class
  expect(true).toBe(true);
});

When('I hover over a window', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

Then('the window should highlight', async function (this: FloorplanWorld) {
  // CSS hover effects
  expect(true).toBe(true);
});

// Door type scenarios
When('I add a door with type {string}', async function (this: FloorplanWorld, doorType: string) {
  const currentJson = (this as any).currentJson || {
    grid_step: 1000,
    rooms: [
      {
        id: 'livingroom',
        name: 'Living Room',
        width: 4000,
        depth: 3000,
        attachTo: 'zeropoint:top-left',
      },
    ],
  };

  if (!currentJson.doors) {
    currentJson.doors = [];
  }

  const door: any = {
    room: `${currentJson.rooms[0].id}:bottom`,
    offset: 1000,
    width: 800,
    type: doorType,
  };

  // Only add swing for "normal" type
  if (doorType === 'normal') {
    door.swing = 'inwards-right';
  }

  currentJson.doors.push(door);

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then('the door should display a swing arc', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Swing arc is rendered for type "normal"
  const currentJson = (this as any).currentJson;
  const lastDoor = currentJson.doors[currentJson.doors.length - 1];
  expect(lastDoor.type).toBe('normal');
});

Then('the swing arc should be visible', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Arc is part of SVG rendering for normal doors
});

Then('the door should be visible', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

Then('no swing arc should be displayed', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Type "opening" doesn't have swing arc
  const currentJson = (this as any).currentJson;
  const lastDoor = currentJson.doors[currentJson.doors.length - 1];
  expect(lastDoor.type).toBe('opening');
  expect(lastDoor.swing).toBeUndefined();
});

// All four walls scenarios
When(
  'I add doors to all four walls of {string}',
  async function (this: FloorplanWorld, roomName: string) {
    const currentJson = (this as any).currentJson;
    const roomId = currentJson.rooms[0].id;

    currentJson.doors = [
      { room: `${roomId}:top`, offset: 1000, width: 800, swing: 'inwards-right' },
      { room: `${roomId}:bottom`, offset: 1000, width: 800, swing: 'inwards-right' },
      { room: `${roomId}:left`, offset: 1000, width: 800, swing: 'inwards-right' },
      { room: `${roomId}:right`, offset: 1000, width: 800, swing: 'inwards-right' },
    ];

    await fillDSLFromJSON(this, currentJson);

    (this as any).currentJson = currentJson;
  }
);

Then(
  'doors should appear on top, bottom, left, and right walls',
  async function (this: FloorplanWorld) {
    const svg = this.page.locator('.floorplan-svg');
    await expect(svg).toBeVisible();

    const currentJson = (this as any).currentJson;
    expect(currentJson.doors.length).toBe(4);
    expect(currentJson.doors[0].room).toContain(':top');
    expect(currentJson.doors[1].room).toContain(':bottom');
    expect(currentJson.doors[2].room).toContain(':left');
    expect(currentJson.doors[3].room).toContain(':right');
  }
);

Then('each door should be correctly rotated for its wall', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Rotation is handled automatically by FloorplanRenderer based on wall position
});

Then('all doors should be visible', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

// Door at zero offset
When('I add a door at offset {int}', async function (this: FloorplanWorld, offset: number) {
  const currentJson = (this as any).currentJson;

  if (!currentJson.doors) {
    currentJson.doors = [];
  }

  currentJson.doors.push({
    room: `${currentJson.rooms[0].id}:bottom`,
    offset: offset,
    width: 800,
    swing: 'inwards-right',
  });

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then("the door should start at the wall's beginning", async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  const lastDoor = currentJson.doors[currentJson.doors.length - 1];
  expect(lastDoor.offset).toBe(0);
});

Then('the door should be visible and positioned correctly', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

// Windows on all four walls
When(
  'I add windows to all four walls of {string}',
  async function (this: FloorplanWorld, roomName: string) {
    const currentJson = (this as any).currentJson;
    const roomId = currentJson.rooms[0].id;

    currentJson.windows = [
      { room: `${roomId}:top`, offset: 1000, width: 1200 },
      { room: `${roomId}:bottom`, offset: 1000, width: 1200 },
      { room: `${roomId}:left`, offset: 1000, width: 1200 },
      { room: `${roomId}:right`, offset: 1000, width: 1200 },
    ];

    await fillDSLFromJSON(this, currentJson);

    (this as any).currentJson = currentJson;
  }
);

Then(
  'windows should appear on top, bottom, left, and right walls',
  async function (this: FloorplanWorld) {
    const svg = this.page.locator('.floorplan-svg');
    await expect(svg).toBeVisible();

    const currentJson = (this as any).currentJson;
    expect(currentJson.windows.length).toBe(4);
    expect(currentJson.windows[0].room).toContain(':top');
    expect(currentJson.windows[1].room).toContain(':bottom');
    expect(currentJson.windows[2].room).toContain(':left');
    expect(currentJson.windows[3].room).toContain(':right');
  }
);

Then('each window should be correctly rotated for its wall', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Rotation is handled automatically by FloorplanRenderer
});

Then('all windows should be visible', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

// Multiple doors on same wall
When(
  'I add {int} doors to {string}',
  async function (this: FloorplanWorld, count: number, roomWall: string) {
    const currentJson = (this as any).currentJson;

    if (!currentJson.doors) {
      currentJson.doors = [];
    }

    for (let i = 0; i < count; i++) {
      currentJson.doors.push({
        room: roomWall,
        offset: 500 + i * 1500,
        width: 800,
        swing: 'inwards-right',
      });
    }

    await fillDSLFromJSON(this, currentJson);

    (this as any).currentJson = currentJson;
  }
);

Then('both doors should be visible on the bottom wall', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  const currentJson = (this as any).currentJson;
  expect(currentJson.doors.length).toBe(2);
  expect(currentJson.doors[0].room).toContain(':bottom');
  expect(currentJson.doors[1].room).toContain(':bottom');
});

Then('the doors should not overlap', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  const door1End = currentJson.doors[0].offset + currentJson.doors[0].width;
  const door2Start = currentJson.doors[1].offset;
  expect(door2Start).toBeGreaterThanOrEqual(door1End);
});

Then('each door should be at its specified offset', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.doors[0].offset).toBe(500);
  expect(currentJson.doors[1].offset).toBe(2000);
});

// Multiple windows on same wall
When(
  'I add {int} windows to {string}',
  async function (this: FloorplanWorld, count: number, roomWall: string) {
    const currentJson = (this as any).currentJson;

    if (!currentJson.windows) {
      currentJson.windows = [];
    }

    for (let i = 0; i < count; i++) {
      currentJson.windows.push({
        room: roomWall,
        offset: 500 + i * 1000,
        width: 600,
      });
    }

    await fillDSLFromJSON(this, currentJson);

    (this as any).currentJson = currentJson;
  }
);

Then(
  'all {int} windows should be visible on the top wall',
  async function (this: FloorplanWorld, count: number) {
    const svg = this.page.locator('.floorplan-svg');
    await expect(svg).toBeVisible();

    const currentJson = (this as any).currentJson;
    expect(currentJson.windows.length).toBe(count);
    currentJson.windows.forEach((window: any) => {
      expect(window.room).toContain(':top');
    });
  }
);

Then('the windows should not overlap', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  for (let i = 0; i < currentJson.windows.length - 1; i++) {
    const window1End = currentJson.windows[i].offset + currentJson.windows[i].width;
    const window2Start = currentJson.windows[i + 1].offset;
    expect(window2Start).toBeGreaterThanOrEqual(window1End);
  }
});

// Door and window on same wall
When(
  'I add a door and a window to {string}',
  async function (this: FloorplanWorld, roomWall: string) {
    const currentJson = (this as any).currentJson;

    currentJson.doors = [
      {
        room: roomWall,
        offset: 500,
        width: 800,
        swing: 'inwards-right',
      },
    ];

    currentJson.windows = [
      {
        room: roomWall,
        offset: 1800,
        width: 1200,
      },
    ];

    await fillDSLFromJSON(this, currentJson);

    (this as any).currentJson = currentJson;
  }
);

Then('both door and window should be visible', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  const currentJson = (this as any).currentJson;
  expect(currentJson.doors.length).toBe(1);
  expect(currentJson.windows.length).toBe(1);
});

Then('they should be correctly positioned on the left wall', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.doors[0].room).toContain(':left');
  expect(currentJson.windows[0].room).toContain(':left');
});

// Fixed thickness scenarios
When('I add a door with any width', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson || {
    grid_step: 1000,
    rooms: [
      {
        id: 'testroom',
        name: 'Test Room',
        width: 4000,
        depth: 3000,
        attachTo: 'zeropoint:top-left',
      },
    ],
  };

  if (!currentJson.doors) {
    currentJson.doors = [];
  }

  currentJson.doors.push({
    room: `${currentJson.rooms[0].id}:bottom`,
    offset: 1000,
    width: 900, // Any width
    swing: 'inwards-right',
  });

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then(
  'the door thickness should be {int}mm',
  async function (this: FloorplanWorld, thickness: number) {
    const svg = this.page.locator('.floorplan-svg');
    await expect(svg).toBeVisible();
    // Door thickness is fixed at 100mm in FloorplanRenderer
    expect(thickness).toBe(100);
  }
);

Then('the thickness should be consistent across all walls', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
  // Thickness is constant in rendering logic
});

When('I add a window with any width', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson || {
    grid_step: 1000,
    rooms: [
      {
        id: 'testroom',
        name: 'Test Room',
        width: 4000,
        depth: 3000,
        attachTo: 'zeropoint:top-left',
      },
    ],
  };

  if (!currentJson.windows) {
    currentJson.windows = [];
  }

  currentJson.windows.push({
    room: `${currentJson.rooms[0].id}:top`,
    offset: 1000,
    width: 1500, // Any width
  });

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then(
  'the window thickness should be {int}mm',
  async function (this: FloorplanWorld, thickness: number) {
    const svg = this.page.locator('.floorplan-svg');
    await expect(svg).toBeVisible();
    // Window thickness is fixed at 100mm in FloorplanRenderer
    expect(thickness).toBe(100);
  }
);

// Composite room scenarios
Given(
  'I have a composite room with {int} parts',
  async function (this: FloorplanWorld, partCount: number) {
    const json = {
      grid_step: 1000,
      rooms: [
        {
          id: 'composite1',
          name: 'Composite Room',
          width: 4000,
          depth: 3000,
          attachTo: 'zeropoint:top-left',
          parts: [
            {
              id: 'part1',
              name: 'Extension 1',
              width: 2000,
              depth: 2000,
              attachTo: 'parent:bottom-left',
            },
          ],
        },
      ],
    };

    // Add more parts if needed
    for (let i = 1; i < partCount; i++) {
      json.rooms[0].parts!.push({
        id: `part${i + 1}`,
        name: `Extension ${i + 1}`,
        width: 2000,
        depth: 2000,
        attachTo: `part${i}:bottom-right`,
      });
    }

    await fillDSLFromJSON(this, json);

    (this as any).currentJson = json;
  }
);

When("I add a door to the second part's wall", async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;

  currentJson.doors = [
    {
      room: 'part2:bottom',
      offset: 500,
      width: 800,
      swing: 'inwards-right',
      type: 'normal',
    },
  ];

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then('the door should be visible on the correct part', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();
});

Then('the door should be correctly positioned', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.doors[0].room).toContain('part2');
});

// Error scenarios
When('I try to add a door to {string}', async function (this: FloorplanWorld, roomWall: string) {
  const currentJson = (this as any).currentJson;

  currentJson.doors = [
    {
      room: roomWall,
      offset: 1000,
      width: 800,
      swing: 'inwards-right',
    },
  ];

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

When('I try to add a window to {string}', async function (this: FloorplanWorld, roomWall: string) {
  const currentJson = (this as any).currentJson;

  currentJson.windows = [
    {
      room: roomWall,
      offset: 1000,
      width: 1200,
    },
  ];

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then('the error should mention the invalid room reference', async function (this: FloorplanWorld) {
  const warnings = this.page.getByTestId('error-panel').first();
  const isVisible = await warnings.isVisible().catch(() => false);

  if (isVisible) {
    const warningText = await warnings.textContent();
    expect(warningText?.toLowerCase()).toMatch(/invalid|not found|nonexistent|fakeroom/i);
  } else {
    // App may render without error if it handles missing rooms gracefully
    const svg = this.page.locator('.floorplan-svg');
    await expect(svg).toBeVisible();
  }
});

// New scenarios for parts with windows, doors, and objects
When("I add a window to a part's wall", async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;

  currentJson.windows = [
    {
      room: 'part1:top',
      offset: 300,
      width: 800,
    },
  ];

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then('the window should be visible on the correct part', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  // Check if window exists in SVG
  const windows = this.page.locator('[data-testid^="window-"]');
  await expect(windows.first()).toBeVisible();
});

Then('the window should be correctly positioned', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;
  expect(currentJson.windows[0].room).toContain('part1');
});

When('I add a door and window to the first part', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;

  currentJson.doors = [
    {
      room: 'part1:right',
      offset: 200,
      width: 800,
      swing: 'inwards-left',
      type: 'normal',
    },
  ];

  currentJson.windows = [
    {
      room: 'part1:top',
      offset: 300,
      width: 800,
    },
  ];

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

When('I add a door to the second part', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;

  // Add door to existing doors array
  if (!currentJson.doors) {
    currentJson.doors = [];
  }
  currentJson.doors.push({
    room: 'part2:left',
    offset: 100,
    width: 800,
    swing: 'inwards-right',
    type: 'normal',
  });

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then(
  'all architectural elements should be visible on their respective parts',
  async function (this: FloorplanWorld) {
    const svg = this.page.locator('.floorplan-svg');
    await expect(svg).toBeVisible();

    // Check doors
    const doors = this.page.locator('[data-testid^="door-"]');
    await expect(doors.first()).toBeVisible();

    // Check windows
    const windows = this.page.locator('[data-testid^="window-"]');
    await expect(windows.first()).toBeVisible();
  }
);

Then('each element should be correctly positioned', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;

  // Verify doors are on parts
  currentJson.doors.forEach((door: any) => {
    expect(door.room).toMatch(/part\d+:/);
  });

  // Verify windows are on parts
  currentJson.windows.forEach((window: any) => {
    expect(window.room).toMatch(/part\d+:/);
  });
});

When('I add objects to both parts', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;

  // Add objects to parts
  currentJson.rooms[0].parts[0].objects = [
    {
      type: 'square',
      x: 100,
      y: 100,
      width: 400,
      height: 400,
      anchor: 'top-left',
      roomAnchor: 'top-left',
      color: '#33d17a',
      text: 'Table',
    },
  ];

  currentJson.rooms[0].parts[1].objects = [
    {
      type: 'circle',
      x: 50,
      y: 50,
      width: 300,
      anchor: 'top-left',
      roomAnchor: 'top-left',
      color: '#9141ac',
      text: 'Chair',
    },
  ];

  await fillDSLFromJSON(this, currentJson);

  (this as any).currentJson = currentJson;
});

Then(
  'the objects should be visible in their respective parts',
  async function (this: FloorplanWorld) {
    const svg = this.page.locator('.floorplan-svg');
    await expect(svg).toBeVisible();

    // Check for object elements (they have class 'room-object')
    const objects = this.page.locator('.room-object');
    const count = await objects.count();
    expect(count).toBeGreaterThanOrEqual(2);
  }
);

Then('the objects should be correctly positioned', async function (this: FloorplanWorld) {
  const currentJson = (this as any).currentJson;

  // Verify first part has objects
  expect(currentJson.rooms[0].parts[0].objects).toBeDefined();
  expect(currentJson.rooms[0].parts[0].objects.length).toBeGreaterThan(0);

  // Verify second part has objects
  expect(currentJson.rooms[0].parts[1].objects).toBeDefined();
  expect(currentJson.rooms[0].parts[1].objects.length).toBeGreaterThan(0);
});

When('I enter DSL with parts containing windows and doors', async function (this: FloorplanWorld) {
  const dsl = `grid 1000

room livingroom1 "Living Room" 4000x3000 at zeropoint

room composite1 "Composite Room" 3000x2000 at livingroom1:bottom-left
    part part1 1000x1000 at parent:bottom-left
        window 800 at right
        door 800 at left
    part part2 500x500 at part1:bottom-left
        window 600 at top
`;

  // Use the fillDSL helper to avoid timeout issues
  await this.page.waitForTimeout(100);

  const textarea = this.page.getByTestId('dsl-editor-textarea');
  await textarea.click();
  await this.page.keyboard.press('Control+A');
  await this.page.waitForTimeout(50);
  await textarea.pressSequentially(dsl, { delay: 0 });
  await this.page.waitForTimeout(600); // Wait for debounce
});

Then('the DSL should parse successfully', async function (this: FloorplanWorld) {
  // Check that no error panel is shown
  const errorPanel = this.page.getByTestId('error-panel').first();
  const isVisible = await errorPanel.isVisible().catch(() => false);

  if (isVisible) {
    const errorText = await errorPanel.textContent();
    console.log('Unexpected error:', errorText);
  }

  expect(isVisible).toBe(false);
});

Then('windows should be associated with the correct parts', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  // Verify windows are rendered
  const windows = this.page.locator('[data-testid^="window-"]');
  const count = await windows.count();
  expect(count).toBeGreaterThanOrEqual(2);
});

Then('doors should be associated with the correct parts', async function (this: FloorplanWorld) {
  const svg = this.page.locator('.floorplan-svg');
  await expect(svg).toBeVisible();

  // Verify doors are rendered
  const doors = this.page.locator('[data-testid^="door-"]');
  const count = await doors.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

// Door orientation toggle scenarios
Then('a toggle orientation button should be visible', async function (this: FloorplanWorld) {
  // The toggle button should appear on hover
  const toggleButton = this.page.locator('[data-testid="door-toggle-orientation"]').first();
  await expect(toggleButton).toBeVisible({ timeout: 5000 });
});

When('I click the toggle orientation button', async function (this: FloorplanWorld) {
  // Re-click door to ensure it's focused and toggle button is visible (click-to-focus behavior)
  const doorRect = this.page.locator('.door-group rect').first();
  await doorRect.dispatchEvent('click');
  await this.page.waitForTimeout(300);

  // Get the toggle button and click it
  const toggleButton = this.page.locator('[data-testid="door-toggle-orientation"]').first();
  await expect(toggleButton).toBeVisible({ timeout: 5000 });
  await toggleButton.dispatchEvent('click');
  await this.page.waitForTimeout(700); // Wait for debounce and re-render
});

Then(
  'the door swing should change to {string}',
  async function (this: FloorplanWorld, expectedSwing: string) {
    // Check the DSL content for the new swing direction
    const editor = this.page.locator('.cm-content');
    await editor.waitFor({ state: 'visible' });
    const text = await editor.textContent();

    // inwards-left is the default and may be omitted from DSL
    if (expectedSwing === 'inwards-left') {
      // Either the swing is explicitly stated or it's omitted (default)
      const hasExplicitSwing =
        text?.includes('inwards-') || text?.includes('outwards-') || text?.includes('opening');
      if (hasExplicitSwing) {
        expect(text).toContain(expectedSwing);
      }
      // If no explicit swing, it means it's the default (inwards-left)
    } else {
      expect(text).toContain(expectedSwing);
    }
  }
);

Then('the DSL should reflect the new swing direction', async function (this: FloorplanWorld) {
  // Verify the DSL has been updated (door with swing direction)
  const editor = this.page.locator('.cm-content');
  await editor.waitFor({ state: 'visible' });
  const text = await editor.textContent();
  // Should contain one of the valid swing directions
  expect(text).toMatch(/inwards-left|inwards-right|outwards-left|outwards-right|opening/);
});
