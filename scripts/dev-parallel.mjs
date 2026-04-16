#!/usr/bin/env node
// Tiny zero-dep parallel process runner. Each argv is "label=command"; the
// command is handed to a shell so quoting works naturally. On SIGINT/SIGTERM
// or any child exiting non-zero, the rest are killed and the exit code is
// propagated.
import { spawn } from 'node:child_process';

const specs = process.argv.slice(2).map((arg) => {
  const i = arg.indexOf('=');
  if (i === -1) {
    console.error(`dev-parallel: expected "label=command", got: ${arg}`);
    process.exit(2);
  }
  return { label: arg.slice(0, i), command: arg.slice(i + 1) };
});

if (specs.length === 0) {
  console.error('usage: dev-parallel.mjs "label=command" ...');
  process.exit(2);
}

const COLORS = ['\x1b[36m', '\x1b[35m', '\x1b[32m', '\x1b[33m', '\x1b[34m'];
const RESET = '\x1b[0m';
const pad = Math.max(...specs.map((s) => s.label.length));
const prefix = (label, color) => `${color}[${label.padEnd(pad)}]${RESET} `;

function pipe(stream, label, color) {
  let buf = '';
  stream.on('data', (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf('\n')) !== -1) {
      process.stdout.write(prefix(label, color) + buf.slice(0, i + 1));
      buf = buf.slice(i + 1);
    }
  });
  stream.on('end', () => {
    if (buf) process.stdout.write(prefix(label, color) + buf + '\n');
  });
}

const children = specs.map((spec, i) => {
  const color = COLORS[i % COLORS.length];
  const child = spawn(spec.command, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  pipe(child.stdout, spec.label, color);
  pipe(child.stderr, spec.label, color);
  return { spec, child, color };
});

let shuttingDown = false;
let exitCode = 0;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (code != null) exitCode = code;
  for (const { child } of children) {
    if (child.exitCode == null && child.signalCode == null) {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
    }
  }
  setTimeout(() => {
    for (const { child } of children) {
      if (child.exitCode == null && child.signalCode == null) {
        try { child.kill('SIGKILL'); } catch { /* ignore */ }
      }
    }
  }, 5000).unref();
}

for (const { spec, child, color } of children) {
  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    process.stdout.write(prefix(spec.label, color) + `exited (${reason})\n`);
    if (!shuttingDown) shutdown(code ?? 1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

await Promise.all(
  children.map(({ child }) => new Promise((r) => child.once('close', r))),
);
process.exit(exitCode);
