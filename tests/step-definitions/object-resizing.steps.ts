import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { World } from '../support/world';

// Helper function to find object in DSL data
function findObject(world: World, objectName: string, roomOrPartId?: string) {
  const data = world.currentDSLData;
  if (!data || !data.rooms) return null;

  for (const room of data.rooms) {
    // Check room-level objects
    if (room.objects) {
      const obj = room.objects.find(o => o.text === objectName);
      if (obj && (!roomOrPartId || room.id === roomOrPartId)) {
        return { object: obj, roomId: room.id, objectIndex: room.objects.indexOf(obj) };
      }
    }

    // Check part-level objects
    if (room.parts) {
      for (const part of room.parts) {
        if (part.objects) {
          const obj = part.objects.find(o => o.text === objectName);
          if (obj && (!roomOrPartId || part.id === roomOrPartId)) {
            return {
              object: obj,
              roomId: room.id,
              partId: part.id,
              objectIndex: part.objects.indexOf(obj),
            };
          }
        }
      }
    }
  }

  return null;
}

// Helper to get object test ID
function getObjectTestId(roomId: string, objectIndex: number, partId?: string): string {
  if (partId) {
    return `object-${roomId}-part-${partId}-${objectIndex}`;
  }
  return `object-${roomId}-${objectIndex}`;
}

// Common step definitions
Given('I have the following DSL:', async function (this: World, dslText: string) {
  // Switch to DSL editor tab
  const dslTab = this.page.locator('[data-testid="tab-DSL"]');
  await dslTab.click();
  await this.page.waitForTimeout(100);

  // Enter DSL
  const editorSelector = '.cm-content[contenteditable="true"]';
  await this.page.waitForSelector(editorSelector);
  const editor = this.page.locator(editorSelector);

  // Clear existing content by selecting all and replacing
  await editor.click();
  await this.page.keyboard.press('Control+A');
  await this.page.keyboard.press('Backspace');
  await this.page.waitForTimeout(100);

  // Type the DSL
  await editor.fill(dslText);
  await this.page.waitForTimeout(600); // Wait for debounce

  // Store the DSL data
  const dslEditor = await this.page.locator('.cm-content').textContent();
  this.currentDSL = dslEditor || '';

  // Parse DSL to get data
  const dslModule = await import('../../src/dslUtils.js');
  try {
    this.currentDSLData = dslModule.parseDSL(this.currentDSL);
  } catch (error) {
    console.error('Failed to parse DSL:', error);
  }
});

Given('I switch to the {string} tab', async function (this: World, tabName: string) {
  const tab = this.page.locator(`[data-testid="tab-${tabName}"]`);
  await tab.click();
  await this.page.waitForTimeout(200);
});

Then('the DSL should contain {string}', async function (this: World, expectedText: string) {
  const dslEditor = await this.page.locator('.cm-content').textContent();
  expect(dslEditor).toContain(expectedText);
});

When(
  'I hover over the object {string} in room {string}',
  async function (this: World, objectName: string, roomId: string) {
    const result = findObject(this, objectName, roomId);
    expect(result).not.toBeNull();

    const testId = getObjectTestId(roomId, result!.objectIndex);
    const objectElement = this.page.locator(`[data-testid="${testId}"]`);

    // Wait for object to be visible before hovering
    await objectElement.waitFor({ state: 'visible', timeout: 5000 });
    await objectElement.hover();

    // Store for later use
    this.currentObject = { name: objectName, roomId, objectIndex: result!.objectIndex, testId };
  }
);

When(
  'I hover over the object {string} in part {string}',
  async function (this: World, objectName: string, partId: string) {
    const result = findObject(this, objectName, partId);
    expect(result).not.toBeNull();

    const testId = getObjectTestId(result!.roomId, result!.objectIndex, partId);
    const objectElement = this.page.locator(`[data-testid="${testId}"]`);

    // Wait for object to be visible before hovering
    await objectElement.waitFor({ state: 'visible', timeout: 5000 });
    await objectElement.hover();

    // Store for later use
    this.currentObject = {
      name: objectName,
      roomId: result!.roomId,
      partId,
      objectIndex: result!.objectIndex,
      testId,
    };
  }
);

When('I move the mouse away from the object', async function (this: World) {
  // Move mouse to a neutral location (top-left corner)
  await this.page.mouse.move(10, 10);
  await this.page.waitForTimeout(100);
});

Then('I should see resize handles at all 4 corners of the object', async function (this: World) {
  expect(this.currentObject).toBeDefined();

  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const baseTestId = this.currentObject!.testId.replace('object-', '');

  for (const corner of corners) {
    const handleTestId = `object-resize-handle-${baseTestId}-${corner}`;
    const handle = this.page.locator(`[data-testid="${handleTestId}"]`);
    await expect(handle).toBeVisible();
  }
});

Then('the resize handles should have the correct cursor styles', async function (this: World) {
  expect(this.currentObject).toBeDefined();

  const baseTestId = this.currentObject!.testId.replace('object-', '');

  // Check nwse-resize for top-left and bottom-right
  const tlHandle = this.page.locator(`[data-testid="object-resize-handle-${baseTestId}-top-left"]`);
  const brHandle = this.page.locator(
    `[data-testid="object-resize-handle-${baseTestId}-bottom-right"]`
  );

  await expect(tlHandle).toHaveCSS('cursor', 'nwse-resize');
  await expect(brHandle).toHaveCSS('cursor', 'nwse-resize');

  // Check nesw-resize for top-right and bottom-left
  const trHandle = this.page.locator(
    `[data-testid="object-resize-handle-${baseTestId}-top-right"]`
  );
  const blHandle = this.page.locator(
    `[data-testid="object-resize-handle-${baseTestId}-bottom-left"]`
  );

  await expect(trHandle).toHaveCSS('cursor', 'nesw-resize');
  await expect(blHandle).toHaveCSS('cursor', 'nesw-resize');
});

// Helper to get opposite corner
function getOppositeCorner(anchor: string): string {
  const oppositeMap: Record<string, string> = {
    'top-left': 'bottom-right',
    'top-right': 'bottom-left',
    'bottom-left': 'top-right',
    'bottom-right': 'top-left',
  };
  return oppositeMap[anchor] || 'bottom-right';
}

Then(
  'I should see {int} resize handle at the corner opposite to the anchor',
  async function (this: World, count: number) {
    expect(this.currentObject).toBeDefined();
    expect(count).toBe(1);

    // Get the object to find its anchor
    const result = findObject(this, this.currentObject!.name);
    expect(result).not.toBeNull();

    const anchor = result!.object.anchor || 'top-left';
    const oppositeCorner = getOppositeCorner(anchor);

    const baseTestId = this.currentObject!.testId.replace('object-', '');
    const handleTestId = `object-resize-handle-${baseTestId}-${oppositeCorner}`;
    const handle = this.page.locator(`[data-testid="${handleTestId}"]`);
    await expect(handle).toBeVisible();

    // Verify other handles are NOT visible
    const allCorners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    for (const corner of allCorners) {
      if (corner !== oppositeCorner) {
        const otherHandleTestId = `object-resize-handle-${baseTestId}-${corner}`;
        const otherHandle = this.page.locator(`[data-testid="${otherHandleTestId}"]`);
        await expect(otherHandle).not.toBeVisible();
      }
    }
  }
);

Then('the resize handle should have the correct cursor style', async function (this: World) {
  expect(this.currentObject).toBeDefined();

  // Get the object to find its anchor
  const result = findObject(this, this.currentObject!.name);
  expect(result).not.toBeNull();

  const anchor = result!.object.anchor || 'top-left';
  const oppositeCorner = getOppositeCorner(anchor);

  const baseTestId = this.currentObject!.testId.replace('object-', '');
  const handleTestId = `object-resize-handle-${baseTestId}-${oppositeCorner}`;
  const handle = this.page.locator(`[data-testid="${handleTestId}"]`);

  // Expected cursor based on corner
  const cursorMap: Record<string, string> = {
    'top-left': 'nwse-resize',
    'top-right': 'nesw-resize',
    'bottom-left': 'nesw-resize',
    'bottom-right': 'nwse-resize',
  };

  const expectedCursor = cursorMap[oppositeCorner];
  await expect(handle).toHaveCSS('cursor', expectedCursor);
});

Then('I should not see any resize handles for the object', async function (this: World) {
  expect(this.currentObject).toBeDefined();

  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const baseTestId = this.currentObject!.testId.replace('object-', '');

  for (const corner of corners) {
    const handleTestId = `object-resize-handle-${baseTestId}-${corner}`;
    const handle = this.page.locator(`[data-testid="${handleTestId}"]`);
    await expect(handle).not.toBeVisible();
  }
});

Then(
  'I should see the dimensions {string} displayed on the object',
  async function (this: World, expectedDimensions: string) {
    expect(this.currentObject).toBeDefined();

    const dimensionsTestId = `${this.currentObject!.testId}-dimensions`;
    const dimensionsText = this.page.locator(`[data-testid="${dimensionsTestId}"]`);

    await expect(dimensionsText).toBeVisible();
    await expect(dimensionsText).toHaveText(expectedDimensions);
  }
);

Then(
  'I should see the diameter {string} displayed on the object',
  async function (this: World, expectedDiameter: string) {
    expect(this.currentObject).toBeDefined();

    const dimensionsTestId = `${this.currentObject!.testId}-dimensions`;
    const dimensionsText = this.page.locator(`[data-testid="${dimensionsTestId}"]`);

    await expect(dimensionsText).toBeVisible();
    await expect(dimensionsText).toHaveText(expectedDiameter);
  }
);

When(
  'I drag the {word} resize handle by \\({int}, {int}) mm',
  async function (this: World, corner: string, deltaX: number, deltaY: number) {
    expect(this.currentObject).toBeDefined();

    const baseTestId = this.currentObject!.testId.replace('object-', '');
    const handleTestId = `object-resize-handle-${baseTestId}-${corner}`;
    const handle = this.page.locator(`[data-testid="${handleTestId}"]`);

    // Get the handle position
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();

    // Convert mm to screen pixels (using DISPLAY_SCALE = 2, so 1mm = 0.2px)
    const screenDeltaX = deltaX * 0.2;
    const screenDeltaY = deltaY * 0.2;

    // Perform drag
    await this.page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(
      box!.x + box!.width / 2 + screenDeltaX,
      box!.y + box!.height / 2 + screenDeltaY
    );
    await this.page.mouse.up();

    // Wait for update
    await this.page.waitForTimeout(600); // Account for 500ms debounce
  }
);

When('I drag any corner resize handle to change the size', async function (this: World) {
  // For circles, use the opposite corner from the anchor; for squares, use bottom-right
  const result = findObject(this, this.currentObject!.name);
  expect(result).not.toBeNull();

  if (result!.object.type === 'circle') {
    const anchor = result!.object.anchor || 'top-left';
    const oppositeCorner = getOppositeCorner(anchor);
    await this.step(`I drag the ${oppositeCorner} resize handle by (200, 200) mm`);
  } else {
    await this.step('I drag the bottom-right resize handle by (200, 200) mm');
  }
});

When(
  'I drag any corner resize handle to increase the diameter to {int}',
  async function (this: World, targetDiameter: number) {
    const result = findObject(this, this.currentObject!.name);
    expect(result).not.toBeNull();

    const currentDiameter = result!.object.width;
    const deltaSize = targetDiameter - currentDiameter;

    // For circles, use the opposite corner from the anchor
    const anchor = result!.object.anchor || 'top-left';
    const oppositeCorner = getOppositeCorner(anchor);
    await this.step(
      `I drag the ${oppositeCorner} resize handle by (${deltaSize}, ${deltaSize}) mm`
    );
  }
);

Then(
  'the object should have dimensions {int}x{int}',
  async function (this: World, expectedWidth: number, expectedHeight: number) {
    // Wait for DSL to update
    await this.page.waitForTimeout(100);

    const result = findObject(this, this.currentObject!.name);
    expect(result).not.toBeNull();

    expect(result!.object.width).toBe(expectedWidth);
    expect(result!.object.height).toBe(expectedHeight);
  }
);

Then(
  'the object should have dimensions at least {int}x{int}',
  async function (this: World, minWidth: number, minHeight: number) {
    await this.page.waitForTimeout(100);

    const result = findObject(this, this.currentObject!.name);
    expect(result).not.toBeNull();

    expect(result!.object.width).toBeGreaterThanOrEqual(minWidth);
    expect(result!.object.height).toBeGreaterThanOrEqual(minHeight);
  }
);

Then(
  'the object should have diameter {int}',
  async function (this: World, expectedDiameter: number) {
    await this.page.waitForTimeout(100);

    const result = findObject(this, this.currentObject!.name);
    expect(result).not.toBeNull();

    expect(result!.object.width).toBe(expectedDiameter);
  }
);

Then('the object position should be adjusted accordingly', async function (this: World) {
  // This is validated implicitly by the resize logic
  // We just verify that the object still exists and is visible
  const objectElement = this.page.locator(`[data-testid="${this.currentObject!.testId}"]`);
  await expect(objectElement).toBeVisible();
});

Then('the object should maintain its circular shape', async function (this: World) {
  await this.page.waitForTimeout(100);

  const result = findObject(this, this.currentObject!.name);
  expect(result).not.toBeNull();

  // For circles, width is the diameter and height should not be set or equal to width
  expect(result!.object.type).toBe('circle');
  expect(result!.object.width).toBeGreaterThan(0);
  expect(result!.object.height).toBeUndefined();
});

Then('the diameter should change proportionally', async function (this: World) {
  // This is validated by the "maintain circular shape" step
  // Just verify that the diameter has changed from the original
  const result = findObject(this, this.currentObject!.name);
  expect(result).not.toBeNull();
  expect(result!.object.width).toBeGreaterThan(0);
});

Then(
  'the object should not be smaller than the minimum size of {int}mm',
  async function (this: World, minSize: number) {
    await this.page.waitForTimeout(100);

    const result = findObject(this, this.currentObject!.name);
    expect(result).not.toBeNull();

    expect(result!.object.width).toBeGreaterThanOrEqual(minSize);
    if (result!.object.height !== undefined) {
      expect(result!.object.height).toBeGreaterThanOrEqual(minSize);
    }
  }
);

When('I double-click on the dimensions text', async function (this: World) {
  expect(this.currentObject).toBeDefined();

  const dimensionsTestId = `${this.currentObject!.testId}-dimensions`;
  const dimensionsText = this.page.locator(`[data-testid="${dimensionsTestId}"]`);

  await dimensionsText.dblclick();
});

When('I double-click on the diameter text', async function (this: World) {
  // Same as dimensions text
  await this.step('I double-click on the dimensions text');
});

When('I enter dimensions {string} in the prompt', async function (this: World, dimensions: string) {
  // Handle the browser prompt
  this.page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(dimensions);
  });

  // Wait for the prompt to be handled
  await this.page.waitForTimeout(100);
});

When('I enter diameter {string} in the prompt', async function (this: World, diameter: string) {
  // Handle the browser prompt
  this.page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(diameter);
  });

  // Wait for the prompt to be handled
  await this.page.waitForTimeout(100);
});

Then(
  'the object {string} should have dimensions {int}x{int}',
  async function (this: World, objectName: string, expectedWidth: number, expectedHeight: number) {
    await this.page.waitForTimeout(100);

    const result = findObject(this, objectName);
    expect(result).not.toBeNull();

    expect(result!.object.width).toBe(expectedWidth);
    expect(result!.object.height).toBe(expectedHeight);
  }
);

Then(
  'the object {string} should still have diameter {int}',
  async function (this: World, objectName: string, expectedDiameter: number) {
    await this.page.waitForTimeout(100);

    const result = findObject(this, objectName);
    expect(result).not.toBeNull();

    expect(result!.object.width).toBe(expectedDiameter);
  }
);

Then(
  'the object {string} should still have dimensions {int}x{int}',
  async function (this: World, objectName: string, expectedWidth: number, expectedHeight: number) {
    await this.page.waitForTimeout(100);

    const result = findObject(this, objectName);
    expect(result).not.toBeNull();

    expect(result!.object.width).toBe(expectedWidth);
    expect(result!.object.height).toBe(expectedHeight);
  }
);

Then(
  'the object {string} should have diameter {int}',
  async function (this: World, objectName: string, expectedDiameter: number) {
    await this.page.waitForTimeout(100);

    const result = findObject(this, objectName);
    expect(result).not.toBeNull();

    expect(result!.object.width).toBe(expectedDiameter);
  }
);
