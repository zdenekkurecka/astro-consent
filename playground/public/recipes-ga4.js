// Stand-in for gtag.js. Flips a marker so e2e tests can assert the external
// GA4 script path unblocked correctly.
window.__ccRecipeGA4Loaded = true;
document.getElementById('recipe-ga4-marker')?.setAttribute('data-loaded', 'true');
