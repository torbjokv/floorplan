#!/usr/bin/env node

import { spawn } from 'node:child_process';

const [, , ...cliArgs] = process.argv;

// Support running a specific feature, line, or tag
const defaultFeatureGlob = 'tests/features/**/*.feature';
const cucumberArgs = [
  '--config',
  '.cucumber.cjs',
  ...(cliArgs.length > 0 ? cliArgs : [defaultFeatureGlob]),
];

// Base Node options
const nodeOptions = ['--loader', 'ts-node/esm', '--experimental-specifier-resolution=node'];

// Inherit environment and customize per run
const env = {
  ...process.env,
  NODE_OPTIONS: nodeOptions.join(' '),
  TS_NODE_PROJECT: 'tsconfig.cucumber.json',
};

// Spawn cucumber-js via npx
const child = spawn('npx', ['cucumber-js', ...cucumberArgs], {
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', code => process.exit(code ?? 0));
