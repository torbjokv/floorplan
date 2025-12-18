import { jsonToDSL } from '../../src/dslUtils';
import type { FloorplanWorld } from './world';
import type { Page } from '@playwright/test';

/**
 * Helper to fill CodeMirror editor with content
 * Uses keyboard interactions to ensure React's onChange is triggered
 */
export async function fillCodeMirror(page: Page, content: string) {
  const dslContainer = page.getByTestId('dsl-editor');
  await dslContainer.waitFor({ state: 'visible', timeout: 5000 });

  // Click on the editor to focus it
  const cmContent = dslContainer.locator('.cm-content');
  await cmContent.click();

  // Select all existing content
  await page.keyboard.press('Control+a');

  // Use insertText which handles newlines properly
  // This replaces selected text with the new content
  if (content.length > 0) {
    await page.keyboard.insertText(content);
  } else {
    await page.keyboard.press('Delete');
  }
}

/**
 * Helper to get value from CodeMirror editor
 */
export async function getCodeMirrorValue(page: Page): Promise<string> {
  const dslContainer = page.getByTestId('dsl-editor');
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
