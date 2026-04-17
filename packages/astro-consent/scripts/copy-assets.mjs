// Cross-platform asset copy (replaces `mkdir -p && cp`, which is POSIX-only).
//
// We also mirror the repo-root README.md and LICENSE into the package
// directory here. The repo root is the single source of truth for both
// files; this script makes sure npm still ships them with the package
// without requiring contributors to keep two copies in sync by hand.
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const repoRoot = resolve(pkgRoot, '..', '..');

const assets = [
  // [absolute source, absolute destination]
  [resolve(pkgRoot, 'src/styles/base.css'),                       resolve(pkgRoot, 'dist/styles/base.css')],
  // `.astro` files are passed through verbatim — `tsc` doesn't understand
  // them, so the build emits `dist/components/index.js` with a relative
  // import into `./ConsentScript.astro` which Astro/Vite resolves in the
  // consumer's project.
  [resolve(pkgRoot, 'src/components/ConsentScript.astro'),        resolve(pkgRoot, 'dist/components/ConsentScript.astro')],
  [resolve(repoRoot, 'README.md'),                                resolve(pkgRoot, 'README.md')],
  [resolve(repoRoot, 'LICENSE'),                                  resolve(pkgRoot, 'LICENSE')],
];

for (const [src, dst] of assets) {
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
}
