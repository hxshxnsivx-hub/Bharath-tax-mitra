#!/usr/bin/env node
/**
 * dev-local.mjs — One-command local development launcher.
 *
 * Starts BOTH the local mock backend (FastAPI/uvicorn on :3001) and the
 * Vite frontend dev server (:3000), streaming their output to one terminal.
 * Ctrl+C cleanly stops both.
 *
 * Usage:  npm run dev:local   (from the repo root)
 *
 * Why this exists: the frontend defaults its API base URL to
 * http://localhost:3001 (see frontend/src/services/authService.ts). If the
 * mock server is not running, every API call (e.g. Send OTP) fails with
 * "Network error". This launcher guarantees both halves run together.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

/** Resolve a Python executable: prefer `python`, fall back to `python3`. */
const pythonCmd = isWindows ? 'python' : 'python3';

const procs = [];

/**
 * Spawn a labelled child process and prefix its stdout/stderr lines.
 */
function start(label, command, args, cwd, color) {
  const child = spawn(command, args, {
    cwd,
    shell: true,
    env: { ...process.env },
  });

  const prefix = `${color}[${label}]\x1b[0m`;

  const pipe = (stream, out) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) out.write(`${prefix} ${line}\n`);
    });
  };

  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stdout);

  child.on('exit', (code, signal) => {
    process.stdout.write(`${prefix} exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})\n`);
    // If one half dies, tear the whole launcher down so failures are obvious.
    shutdown(code ?? 1);
  });

  procs.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of procs) {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  // Give children a moment to exit, then force-quit the launcher.
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

// 1) Mock backend (FastAPI on :3001)
start(
  'mock-api',
  pythonCmd,
  ['-m', 'uvicorn', 'src.local.mock_server:app', '--port', '3001'],
  resolve(repoRoot, 'backend'),
  CYAN,
);

// 2) Frontend dev server (Vite on :3000)
start(
  'frontend',
  isWindows ? 'npm.cmd' : 'npm',
  ['run', 'dev'],
  resolve(repoRoot, 'frontend'),
  MAGENTA,
);

process.stdout.write(
  `${CYAN}[mock-api]\x1b[0m on http://localhost:3001   ${MAGENTA}[frontend]\x1b[0m on http://localhost:3000\nPress Ctrl+C to stop both.\n`,
);
