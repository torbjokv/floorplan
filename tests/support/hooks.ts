import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { FloorplanWorld } from './world';

// Global setup
BeforeAll(async function() {
  console.log('Starting test suite...');
});

// Global teardown
AfterAll(async function() {
  console.log('Test suite completed');
});

// Before each scenario
Before(async function(this: FloorplanWorld) {
  await this.init();
  // Navigate to the app (adjust URL based on your setup)
  const baseUrl = process.env.BASE_URL || 'http://localhost:5173/floorplan/';
  await this.page.goto(baseUrl);
});

// After each scenario
After(async function(this: FloorplanWorld, { result }) {
  // Take screenshot on failure (only if page exists)
  if (result?.status === 'FAILED' && this.page) {
    try {
      const screenshot = await this.page.screenshot();
      await this.attach(screenshot, 'image/png');
    } catch (error) {
      console.log('Could not capture screenshot:', error);
    }
  }
  await this.cleanup();
});
