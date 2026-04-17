// Lets `tsc` resolve `*.astro` imports while building this package. Astro
// ships its own (richer) ambient declaration in consumer projects, so the
// emitted .d.ts files rely on the user's Astro env to provide accurate
// component types — this shim just keeps the local build from erroring.
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
  const Component: AstroComponentFactory;
  export default Component;
}
