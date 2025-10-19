module.exports = {
  default: {
    paths: ['tests/features/**/*.feature'],
    import: ['tests/support/**/*.ts', 'tests/step-definitions/**/*.ts'],
    loader: ['ts-node/esm'],
    format: [
      'progress-bar',
      'html:test-results/cucumber-report.html',
      'json:test-results/cucumber-report.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    }
  }
};
