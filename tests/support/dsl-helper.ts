import { jsonToDSL } from '../../src/dslUtils';
import type { FloorplanWorld } from './world';
import type { Page } from '@playwright/test';

/**
 * Helper to fill CodeMirror editor with content
 * Uses fill() method for fast and reliable content insertion
 */
export async function fillCodeMirror(page: Page, content: string) {
  const dslContainer = page.getByTestId('dsl-editor');
  await dslContainer.waitFor({ state: 'visible', timeout: 5000 });

  // Find the contenteditable element in CodeMirror
  const editorSelector = '.cm-content[contenteditable="true"]';
  await page.waitForSelector(editorSelector, { timeout: 5000 });
  const editor = page.locator(editorSelector);

  // Click to focus, then fill with content
  await editor.click();
  await editor.fill(content);
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
  // DSL editor is always visible now (GUI editor removed), no tab switching needed

  await fillCodeMirror(world.page, dsl);

  await world.page.waitForTimeout(1000); // Increased from 600ms to 1000ms
  return dsl;
}
