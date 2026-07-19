const config = {
  default: {
    paths: ['tests/features/**/*.feature'],
    import: ['tests/support/**/*.ts', 'tests/step-definitions/**/*.ts'],
    format: [
      'progress-bar',
      'html:test-results/cucumber-report.html',
      'json:test-results/cucumber-report.json'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    publishQuiet: true
  }
};

export default config;
