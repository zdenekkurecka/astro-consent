// Stand-in for fbevents.js. Flips a marker so e2e tests can assert the
// Meta Pixel script path unblocked correctly.
window.__ccRecipeMetaPixelLoaded = true;
document.getElementById('recipe-metapixel-marker')?.setAttribute('data-loaded', 'true');
