// Stand-in for a third-party tracker loaded via `data-cc-src`. Serves as a
// signal from e2e tests that the external script path unblocked correctly.
window.__ccExternalLoaded = true;
document.getElementById('ext-marker')?.setAttribute('data-loaded', 'true');
