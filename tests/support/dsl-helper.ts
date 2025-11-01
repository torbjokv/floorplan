import { jsonToDSL } from '../../src/dslUtils';
import type { FloorplanWorld } from './world';
import type { Page, Locator } from '@playwright/test';

/**
 * Helper to get CodeMirror's contenteditable element
 */
async function getCodeMirrorContent(dslContainer: Locator): Promise<Locator> {
  const contentEditable = dslContainer.locator('.cm-content[contenteditable="true"]');
  await contentEditable.waitFor({ state: 'visible', timeout: 5000 });
  return contentEditable;
}

/**
 * Helper to fill CodeMirror editor with content
 */
export async function fillCodeMirror(page: Page, content: string) {
  const dslContainer = page.getByTestId('dsl-textarea');
  await dslContainer.waitFor({ state: 'visible', timeout: 5000 });

  const contentEditable = await getCodeMirrorContent(dslContainer);

  // Clear existing content and set new value
  await contentEditable.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await contentEditable.fill(content);
}

/**
 * Helper to get value from CodeMirror editor
 */
export async function getCodeMirrorValue(page: Page): Promise<string> {
  const dslContainer = page.getByTestId('dsl-textarea');
  await dslContainer.waitFor({ state: 'visible', timeout: 5000 });

  // Get the text content from CodeMirror
  const content = await dslContainer.locator('.cm-line').allTextContents();
  return content.join('\n');
}

/**
 * Helper function to fill the DSL editor with data from a JSON object
 * This allows existing tests to continue using JSON internally while
 * the UI only supports DSL editing
 */
export async function fillDSLFromJSON(world: FloorplanWorld, jsonData: any) {
  const dsl = jsonToDSL(jsonData);
  await world.page.getByTestId('tab-dsl').click();
  await world.page.waitForTimeout(300); // Wait for tab to activate

  await fillCodeMirror(world.page, dsl);

  await world.page.waitForTimeout(1000); // Increased from 600ms to 1000ms
  return dsl;
}
