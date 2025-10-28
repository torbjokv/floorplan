import { jsonToDSL } from '../../src/dslUtils';
import type { FloorplanWorld } from './world';

/**
 * Helper function to fill the DSL editor with data from a JSON object
 * This allows existing tests to continue using JSON internally while
 * the UI only supports DSL editing
 */
export async function fillDSLFromJSON(world: FloorplanWorld, jsonData: any) {
  const dsl = jsonToDSL(jsonData);
  await world.page.getByTestId('tab-dsl').click();
  await world.page.waitForTimeout(300); // Wait for tab to activate
  const dslTextarea = world.page.getByTestId('dsl-textarea');
  await dslTextarea.waitFor({ state: 'visible', timeout: 5000 });
  await dslTextarea.fill(dsl);
  await world.page.waitForTimeout(1000); // Increased from 600ms to 1000ms
  return dsl;
}
