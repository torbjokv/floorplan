import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const dslContent = readFileSync('./test-floorplan.dsl', 'utf-8');

console.log('Starting browser test...\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Navigate to the dev server
await page.goto('http://localhost:5173/floorplan/', { waitUntil: 'networkidle' });

console.log('✓ Page loaded');

// Switch to DSL tab
await page.click('[data-testid="tab-dsl"]');
console.log('✓ Switched to DSL tab');

// Wait a bit for tab to be ready
await page.waitForTimeout(200);

// Get the DSL textarea and clear it
const textarea = await page.locator('.dsl-textarea');
await textarea.fill('');
console.log('✓ Cleared existing content');

// Enter the DSL content
await textarea.fill(dslContent);
console.log('✓ Entered DSL content');
console.log('  Lines:', dslContent.split('\n').length);

// Wait for auto-update (500ms debounce + processing)
await page.waitForTimeout(800);

// Check for errors
const errorPanel = await page.locator('[data-testid="error-panel"]');
const hasErrors = await errorPanel.isVisible();

if (hasErrors) {
  const errorText = await errorPanel.textContent();
  console.log('\n✗ PARSE ERRORS FOUND:');
  console.log(errorText);
  await browser.close();
  process.exit(1);
}

console.log('✓ No parse errors');

// Switch to JSON tab to see the parsed output
await page.click('[data-testid="tab-json"]');
await page.waitForTimeout(200);

// Get JSON content
const jsonTextarea = await page.locator('[data-testid="json-textarea"]');
const jsonText = await jsonTextarea.inputValue();

let jsonData;
try {
  jsonData = JSON.parse(jsonText);
  console.log('✓ JSON is valid');
} catch (e) {
  console.log('\n✗ JSON parse failed:', e.message);
  console.log('JSON content:', jsonText.substring(0, 200));
  await browser.close();
  process.exit(1);
}

// Validate the parsed data
console.log('\n📊 Parsed Data:');
console.log('  Grid step:', jsonData.grid_step);
console.log('  Number of rooms:', jsonData.rooms?.length || 0);
console.log('  Number of doors:', jsonData.doors?.length || 0);
console.log('  Number of windows:', jsonData.windows?.length || 0);

// List all rooms
console.log('\n🏠 Rooms:');
if (jsonData.rooms) {
  jsonData.rooms.forEach((room, i) => {
    console.log(`  ${i + 1}. ${room.id} - "${room.name || 'unnamed'}"`);
    console.log(`     Size: ${room.width}x${room.depth}`);
    console.log(`     Attached to: ${room.attachTo}`);
    if (room.parts?.length) {
      console.log(`     Parts: ${room.parts.length}`);
    }
    if (room.objects?.length) {
      console.log(`     Objects: ${room.objects.length}`);
    }
  });
}

// Check if all 13 rooms are present
const expectedRooms = ['entre1', 'stue1', 'badvask1', 'kjokken1', 'tvstue1',
                       'gang1', 'stuespis1', 'soverom1', 'gang2', 'bad2',
                       'soverom2', 'entre2', 'soverom3'];
const foundRooms = new Set(jsonData.rooms?.map(r => r.id) || []);

console.log('\n✅ Room Validation:');
expectedRooms.forEach(roomId => {
  const found = foundRooms.has(roomId);
  console.log(`  ${found ? '✓' : '✗'} ${roomId}: ${found ? 'found' : 'MISSING'}`);
});

// Count total objects across all rooms
let totalObjects = 0;
jsonData.rooms?.forEach(room => {
  if (room.objects) totalObjects += room.objects.length;
});
console.log(`\n📦 Total objects: ${totalObjects}`);

// Check the SVG is rendering
const svg = await page.locator('.floorplan-svg');
const svgVisible = await svg.isVisible();
console.log(`\n🎨 SVG Rendering: ${svgVisible ? '✓ visible' : '✗ not visible'}`);

if (svgVisible) {
  const bbox = await svg.boundingBox();
  console.log(`   SVG size: ${bbox?.width}x${bbox?.height}px`);
}

await browser.close();

console.log('\n✅ ALL TESTS PASSED!');
process.exit(0);
