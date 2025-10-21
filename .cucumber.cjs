module.exports = {
  default: {
    // paths removed - specify on command line for better control
    import: ['tests/support/**/*.ts', 'tests/step-definitions/**/*.ts'],
    loader: ['ts-node/esm'],
    format: [
      'progress-bar',
      'html:test-results/cucumber-report.html',
      'json:test-results/cucumber-report.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    timeout: 15000,  // 15 seconds timeout for steps
    tags: 'not @skip'  // Skip scenarios tagged with @skip
  }
};
