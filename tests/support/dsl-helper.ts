import { jsonToDSL } from '../../src/dslUtils';
import type { FloorplanWorld } from './world';
import type { Page } from '@playwright/test';

/**
 * Helper to fill CodeMirror editor with content
 * Uses CodeMirror's setValue API to set content as a single atomic operation
 * This creates a single undo entry instead of one per character
 */
export async function fillCodeMirror(page: Page, content: string) {
  const dslContainer = page.getByTestId('dsl-editor');
  await dslContainer.waitFor({ state: 'visible', timeout: 5000 });

  // Use CodeMirror's API to set value directly
  // This ensures onChange is called once with the full content
  await page.evaluate(
    ({ content: newContent }) => {
      // Find the CodeMirror instance
      const editorElement = document.querySelector('[data-testid="dsl-editor"] .cm-content');
      if (editorElement) {
        const cmView = (editorElement as any).cmView?.view;
        if (cmView) {
          // Use CodeMirror's dispatch to update content
          cmView.dispatch({
            changes: { from: 0, to: cmView.state.doc.length, insert: newContent },
          });
        }
      }
    },
    { content }
  );
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
