# Code Quality Tools

This project uses several tools to maintain code quality, formatting consistency, and detect issues early.

## Available Commands

### Formatting (Prettier)

```bash
# Format all code files
npm run format

# Check if code is formatted (useful in CI)
npm run format:check
```

**Configuration**: [.prettierrc](.prettierrc)
- Single quotes
- Semicolons
- 100 character line width
- 2 space indentation

### Linting (ESLint)

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

**Configuration**: [eslint.config.js](eslint.config.js)

**Checks for**:
- TypeScript errors and best practices
- React hooks usage
- **Unused imports** (automatically detected and flagged as errors)
- **Unused variables** (flagged as warnings)
- Code style consistency

### Test Coverage (Vitest)

```bash
# Run unit tests with coverage report
npm run test:coverage
```

**Configuration**: [vitest.config.ts](vitest.config.ts)

Coverage reports are generated in:
- `coverage/` directory (HTML report)
- Console output (text summary)

**Note**: The main test suite uses Cucumber/Playwright for E2E testing. The coverage command is for future unit tests.

### Full Validation

```bash
# Run all checks: lint + format check + E2E tests
npm run validate
```

This command runs:
1. ESLint checks
2. Prettier format validation
3. Full Cucumber test suite (121 scenarios)

### Build

```bash
# Production build with quality checks
npm run build
```

The build process:
1. Runs ESLint
2. Checks code formatting
3. Compiles TypeScript
4. Builds with Vite

## Integration with Development Workflow

### Pre-commit (Recommended)

Consider adding a pre-commit hook to run formatting and linting automatically:

```bash
# Install husky (optional)
npm install --save-dev husky lint-staged

# Add to package.json:
"lint-staged": {
  "*.{ts,tsx}": ["prettier --write", "eslint --fix"],
  "*.{json,css,md}": ["prettier --write"]
}
```

### IDE Integration

**VS Code**: Install these extensions for real-time feedback:
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)

Add to `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Current Linting Results

Run `npm run lint` to see detected issues:
- Unused imports are automatically flagged
- Unused variables are warned about
- TypeScript type issues are caught
- React hooks dependencies are validated

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Code Quality Checks
  run: |
    npm run lint
    npm run format:check
    npm run test
```
