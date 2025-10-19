# Floorplan Designer - E2E Tests

This directory contains end-to-end tests for the Floorplan Designer application using **Cucumber (Gherkin)** and **Playwright**.

## Test Structure

```
tests/
├── features/              # Gherkin feature files
│   └── project-menu.feature
├── step-definitions/      # Step implementations
│   └── project-menu.steps.ts
└── support/              # Test configuration and helpers
    ├── world.ts          # Custom World with Playwright
    └── hooks.ts          # Before/After hooks
```

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Run Tests

```bash
# Run all tests (headless)
npm test

# Run tests with browser visible
npm run test:headed

# Run tests in CI mode
npm run test:ci
```

### Environment Variables

- `HEADLESS`: Set to `false` to run with visible browser (default: `true`)
- `BASE_URL`: URL of the application (default: `http://localhost:5173/floorplan/`)

## Test Reports

Test results are generated in the `test-results/` directory:

- `cucumber-report.html` - HTML report
- `cucumber-report.json` - JSON report for CI integration
- Screenshots are automatically captured on test failures

## Writing Tests

### Feature Files

Write test scenarios in Gherkin syntax in `tests/features/*.feature`:

```gherkin
Feature: My Feature
  As a user
  I want to perform an action
  So that I achieve a goal

  Scenario: Successful action
    Given I am on the page
    When I click the button
    Then I should see the result
```

### Step Definitions

Implement steps in TypeScript files in `tests/step-definitions/*.steps.ts`:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { FloorplanWorld } from '../support/world';

Given('I am on the page', async function(this: FloorplanWorld) {
  await this.page.goto('/');
});

When('I click the button', async function(this: FloorplanWorld) {
  await this.page.getByRole('button', { name: 'Submit' }).click();
});

Then('I should see the result', async function(this: FloorplanWorld) {
  await expect(this.page.getByText('Success')).toBeVisible();
});
```

## Test Data Attributes

The application uses `data-testid` attributes for reliable element selection:

- `data-testid="project-name-input"` - Project name input
- `data-testid="add-room-btn"` - Add room button
- `data-testid="json-editor"` - JSON editor
- `data-testid="preview-section"` - Preview section
- `data-room-id="roomId"` - Room elements in GUI editor
- `data-room-id="roomId" data-object-index="0"` - Room objects

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

See `.github/workflows/test.yml` for the full CI configuration.

## Debugging

### View Test Execution

```bash
# Run with headed browser
HEADLESS=false npm test

# Use Playwright Inspector
PWDEBUG=1 npm test
```

### Screenshots

Failed tests automatically capture screenshots in `test-results/`.

### Traces

Enable trace recording by modifying `world.ts`:

```typescript
this.context = await this.browser.newContext({
  trace: 'on-first-retry'
});
```

## Best Practices

1. **Use descriptive scenario names** - Make it clear what is being tested
2. **Keep steps reusable** - Write generic steps that can be used across features
3. **Use data-testid** - Prefer test IDs over CSS selectors for stability
4. **Clean up state** - Use hooks to reset localStorage between tests
5. **Wait for conditions** - Use Playwright's auto-waiting features
6. **Avoid hardcoded delays** - Use `waitForSelector` instead of `waitForTimeout`

## Coverage

Current test coverage includes:

- ✅ Project menu operations (create, load, save, delete)
- ✅ Project duplication
- ✅ JSON upload/download
- ✅ URL sharing
- ✅ Natural sorting
- ✅ Read-only mode for shared projects
- ✅ LocalStorage persistence

## Future Tests

Planned test coverage:

- Room creation and editing
- Drag and drop functionality
- Door and window placement
- Composite rooms
- Room objects
- Undo/redo operations
- JSON validation errors
