import { chromium } from 'playwright';

const dslContent = `grid 1000

room Test1 5000x5000 at zeropoint:top-left
    object square "Trapp ned" 2000x1000 #8ff0a4 at bottom-left
    object square "Lav vegg" 2000x150 #b5835a at top-left (0, 2200)
    object square "Trapp opp" 1000x1000 #8ff0a4 at top-left (1000, 2400)
    object square "Skrivebord" 2000x1000 #b5835a at top-left (150, 0)
`;

console.log('Testing object offset parsing...\n');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Set up console logging
page.on('console', msg => {
  console.log('BROWSER:', msg.text());
});

try {
  // Navigate to dev server
  console.log('Navigating to dev server...');
  await page.goto('http://localhost:5173/floorplan/', { waitUntil: 'networkidle' });

  // Switch to DSL tab
  console.log('Switching to DSL tab...');
  await page.click('[data-testid="tab-dsl"]');

  // Enter DSL content
  console.log('Entering DSL content...');
  const textarea = await page.locator('.dsl-textarea');
  await textarea.fill(dslContent);

  // Wait for auto-update
  console.log('Waiting for auto-update...');
  await page.waitForTimeout(800);

  // Check for errors
  const errorPanel = await page.locator('[data-testid="error-panel"]');
  const hasErrors = await errorPanel.isVisible();

  if (hasErrors) {
    const errorText = await errorPanel.textContent();
    console.log('\n✗ PARSE ERRORS:');
    console.log(errorText);
    process.exit(1);
  }

  console.log('\n✓ No parse errors\n');

  // Switch to JSON tab to see parsed output
  await page.click('[data-testid="tab-json"]');
  const jsonTextarea = await page.locator('[data-testid="json-textarea"]');
  const jsonText = await jsonTextarea.inputValue();

  const jsonData = JSON.parse(jsonText);
  const objects = jsonData.rooms[0].objects;

  console.log('Parsed objects:');
  objects.forEach((obj, i) => {
    console.log(`\n${i + 1}. ${obj.text || 'Unnamed'}`);
    console.log(`   Type: ${obj.type}`);
    console.log(`   Size: ${obj.width}x${obj.height || obj.width}`);
    console.log(`   Color: ${obj.color || 'default'}`);
    console.log(`   Object Anchor: ${obj.anchor || 'default'}`);
    console.log(`   Room Anchor: ${obj.roomAnchor || 'default'}`);
    console.log(`   Position: (${obj.x}, ${obj.y})`);
  });

} catch (error) {
  console.error('\n✗ TEST FAILED:', error.message);
  process.exit(1);
} finally {
  // Keep browser open to see console logs
  await page.waitForTimeout(5000);
  await browser.close();
}

console.log('\n✓ TEST COMPLETE');
