// Cross-platform asset copy (replaces `mkdir -p && cp`, which is POSIX-only).
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

const assets = [
  ['src/styles/base.css', 'dist/styles/base.css'],
];

for (const [from, to] of assets) {
  const src = resolve(pkgRoot, from);
  const dst = resolve(pkgRoot, to);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
}
