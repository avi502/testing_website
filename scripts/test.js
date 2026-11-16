#!/usr/bin/env node
/**
 * scripts/test.js
 * Cross-platform test runner for 'npm test'.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');

function findPython() {
  const isWin = process.platform === 'win32';
  const candidates = [];

  if (isWin && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'python3.12.exe'));
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'python.exe'));
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Python', 'pythoncore-3.14-64', 'python.exe'));
  }
  candidates.push('python3.12', 'python3', 'python', 'py');

  for (const cmd of candidates) {
    if (!cmd) continue;
    try {
      execSync(`"${cmd}" -c "import pytest"`, { stdio: 'pipe' });
      return cmd;
    } catch (e) {}
  }

  return 'python';
}

const pythonCmd = findPython();
console.log('\x1b[36m%s\x1b[0m', `Running test suite via: ${pythonCmd} -m pytest -v\n`);

const child = spawn(`"${pythonCmd}" -m pytest -v`, {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..')
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
