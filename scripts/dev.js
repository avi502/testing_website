#!/usr/bin/env node
/**
 * scripts/dev.js
 * Cross-platform launcher for 'npm run dev'.
 * Automatically detects the working Python runtime and launches the Streamlit dashboard.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '=============================================================');
console.log('\x1b[36m%s\x1b[0m', '  ⚡ MotorGuard: Intelligent Predictive Maintenance System   ');
console.log('\x1b[36m%s\x1b[0m', '=============================================================');

function findPython() {
  const isWin = process.platform === 'win32';
  const candidates = [];

  if (isWin && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'python3.12.exe'));
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'python.exe'));
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Python', 'pythoncore-3.14-64', 'python.exe'));
  }
  candidates.push('python3.12', 'python3', 'python', 'py');

  // 1. Find python that has streamlit ready
  for (const cmd of candidates) {
    if (!cmd) continue;
    try {
      execSync(`"${cmd}" -c "import streamlit"`, { stdio: 'pipe' });
      return cmd;
    } catch (e) {}
  }

  // 2. Fallback to any python that responds to --version
  for (const cmd of candidates) {
    if (!cmd) continue;
    try {
      execSync(`"${cmd}" --version`, { stdio: 'pipe' });
      return cmd;
    } catch (e) {}
  }

  return 'python';
}

const pythonCmd = findPython();
console.log('\x1b[32m%s\x1b[0m', `✓ Python runtime: ${pythonCmd}`);

// Ensure dataset exists
const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'motor_sensors.csv');
if (!fs.existsSync(dataFile)) {
  console.log('\x1b[33m%s\x1b[0m', '⚡ Initial dataset missing. Generating 600 sensor records...');
  try {
    execSync(`"${pythonCmd}" "${path.join(__dirname, 'generate_sample_data.py')}" --samples 600 --output "${dataFile}"`, {
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('Warning: Unable to pre-generate data:', err.message);
  }
} else {
  console.log('\x1b[32m%s\x1b[0m', '✓ Telemetry dataset verified (data/motor_sensors.csv)');
}

console.log('\x1b[35m%s\x1b[0m', '🚀 Starting Streamlit application...');
console.log('\x1b[90m%s\x1b[0m', 'Local URL will be available at: http://localhost:8501\n');

const commandString = `"${pythonCmd}" -m streamlit run app.py`;
const child = spawn(commandString, {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..')
});

child.on('error', (err) => {
  console.error('\x1b[31mError launching process:\x1b[0m', err.message);
});

child.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`Process exited with code: ${code}`);
  }
});
