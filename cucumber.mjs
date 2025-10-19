export default {
  default: {
    paths: ['tests/features/**/*.feature'],
    import: ['tests/step-definitions/**/*.ts', 'tests/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    loader: ['ts-node/esm'],
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
