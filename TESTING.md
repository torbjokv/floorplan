# Testing Guide

This document explains the comprehensive E2E test suite for the floorplan designer application.

## Overview

The test suite uses **Cucumber/Gherkin** for behavior-driven development (BDD) with **Playwright** for browser automation. Tests are written in a human-readable format that describes application behavior.

## Running Tests

All test commands use the centralized test runner at `scripts/run-cucumber.js` which handles Node.js configuration and environment setup.

### Run All Tests

```bash
npm run test
```

### Run Tests in Headed Mode (see browser)

```bash
npm run test:headed
```

### Run Specific Feature Tests

```bash
npm run test:project-menu
npm run test:json-editor
npm run test:room-positioning
npm run test:architectural
npm run test:svg-rendering
npm run test:error-handling
```

### Advanced Test Running

The test runner supports flexible test execution patterns:

#### Run a specific feature file

```bash
npm run test tests/features/project-menu.feature
```

#### Run a specific scenario by line number

```bash
npm run test tests/features/gui-editor.feature:42
```

#### Run tests with specific tags

```bash
npm run test -- --tags @smoke
npm run test:ci -- --tags "@smoke and not @slow"
```

#### Run in headed mode for any test

```bash
npm run test:headed tests/features/error-handling.feature
```

#### CI mode (sets CI=true environment variable)

```bash
npm run test:ci
npm run test:ci -- --tags @critical
```

### Skipping Tests

You can skip individual scenarios by adding the `@skip` tag above them:

```gherkin
@skip
Scenario: This scenario will be skipped
  Given some condition
  When I do something
  Then something should happen
```

All scenarios tagged with `@skip` will be automatically excluded from test runs. This is useful for:

- Temporarily disabling flaky tests
- Marking tests that depend on unimplemented features
- Excluding tests during development

## Test Structure

### Feature Files (`tests/features/`)

Human-readable test scenarios written in Gherkin syntax.

1. **project-menu.feature**
   - Opening/closing project menu
   - Creating new projects
   - Loading examples
   - Uploading/downloading JSON
   - Sharing projects
   - Duplicating projects
   - Project sorting and management

2. **room-positioning.feature**
   - Zero Point positioning system
   - Relative positioning
   - Anchor points
   - Offset positioning
   - Composite rooms with parts
   - Circular dependency detection
   - Missing reference errors

3. **architectural-elements.feature**
   - Adding doors to room walls
   - Door swing directions (inwards/outwards, left/right)
   - Door types (normal with arc, opening without arc)
   - Adding windows
   - Wall positioning (top, bottom, left, right)
   - Multiple elements per room

4. **svg-rendering.feature**
   - Dynamic viewBox calculation
   - Grid overlay rendering
   - Room labels (editable on double-click)
   - Composite room rendering
   - Room objects (squares, circles with diameter, not radius)
   - Coordinate system (millimeters, 2:1 display scale)
   - Hover effects
   - Click interactions
   - Performance with 50+ rooms

5. **error-handling.feature**
   - DSL syntax errors
   - Positioning errors
   - Circular dependencies
   - Missing Zero Point validation
   - Missing required fields
   - Partial rendering with errors
   - Error recovery
   - Invalid door/window references

### Support Files (`tests/support/`)

- **world.ts** - Custom World class with browser context
- **hooks.ts** - Before/After hooks for browser setup/teardown

## Test IDs

To enable robust testing, the following `data-testid` attributes are used:

### DSL Editor Components

- Container: `dsl-editor`
- Textarea: `dsl-textarea`

### SVG Components

- Rooms have: `data-room-id="{roomId}"`

### Optimization Opportunities

To speed up tests:

1. **Reuse browser context** across scenarios (requires Cucumber configuration changes)
2. **Run tests in parallel** (Cucumber supports parallel execution)
3. **Skip screenshots** for passing tests
4. **Use tags** to run critical path tests only

## Test Configuration

### Cucumber Config (`.cucumber.cjs`)

```javascript
{
  paths: ['tests/features/**/*.feature'],
  import: ['tests/support/**/*.ts', 'tests/step-definitions/**/*.ts'],
  timeout: 10000,  // 10 seconds per step
  format: ['progress-bar', 'html', 'json']
}
```

### TypeScript Config (`tsconfig.cucumber.json`)

Configured to use ES modules with ts-node loader.

## Continuous Integration

Tests run in CI via GitHub Actions (`.github/workflows/deploy.yml`):

- Tests must pass before deployment to GitHub Pages
- Screenshots are uploaded as artifacts on failure
- Headless mode is used in CI

## Writing New Tests

### 1. Add a Gherkin Scenario

```gherkin
Scenario: My new feature
  Given I have some initial state
  When I perform an action
  Then I should see expected result
```

### 2. Implement Step Definitions

```typescript
Given('I have some initial state', async function (this: FloorplanWorld) {
  // Setup code
});

When('I perform an action', async function (this: FloorplanWorld) {
  await this.page.click('[data-testid="my-button"]');
});

Then('I should see expected result', async function (this: FloorplanWorld) {
  await expect(this.page.locator('.result')).toBeVisible();
});
```

### 3. Add Test IDs to Components

```tsx
<button data-testid="my-button">Click Me</button>
```

### 4. Run and Debug

```bash
npm run test:headed  # See the browser
```

## Best Practices

1. **Use data-testid for selectors** - More reliable than CSS classes
2. **Wait for elements** - Use Playwright's auto-waiting features
3. **Make steps reusable** - Generic steps can be used in multiple scenarios
4. **Keep scenarios independent** - Each scenario should work in isolation
5. **Use Background** - For setup that's common to all scenarios in a feature
6. **Be specific in assertions** - Check exact values when possible
7. **Handle timing** - Account for debouncing (500ms for auto-save)

## Debugging Tips

1. **Run in headed mode** to see what's happening
2. **Check screenshots** in `test-results/` for failures
3. **Add console.log** in step definitions for debugging
4. **Use page.pause()** to pause execution and inspect
5. **Check the HTML report** in `test-results/cucumber-report.html`

## Test Runner Configuration

The test suite uses a centralized Node.js script at `scripts/run-cucumber.js` to handle test execution. This provides:

### Architecture

The runner script:

1. **Configures Node.js options** - Automatically sets `--loader ts-node/esm` and `--experimental-specifier-resolution=node`
2. **Sets TypeScript config** - Uses `tsconfig.cucumber.json` for test compilation
3. **Passes through arguments** - Supports feature files, line numbers, tags, etc.
4. **Manages environment** - Inherits and extends environment variables (HEADLESS, CI)
5. **Executes via npx** - Runs `cucumber-js` from node_modules

### Benefits

- **DRY principle** - Configuration is centralized instead of repeated in each script
- **Maintainability** - Changes to Node options only need to be made once
- **Flexibility** - Supports all Cucumber CLI arguments through pass-through
- **Consistency** - All test commands use identical configuration

### Customization

To modify test configuration, edit `scripts/run-cucumber.js`:

```javascript
// Example: Add additional Node options
const nodeOptions = [
  '--loader',
  'ts-node/esm',
  '--experimental-specifier-resolution=node',
  '--max-old-space-size=4096', // Increase memory limit
];
```

## Resources

- [Cucumber Documentation](https://cucumber.io/docs/cucumber/)
- [Playwright Documentation](https://playwright.dev/)
- [Gherkin Syntax Reference](https://cucumber.io/docs/gherkin/reference/)
