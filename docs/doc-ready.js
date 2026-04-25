/**
 * doc-ready.js
 * Runs inside each document iframe.
 *
 * 1. On sp:ready — posts the rendered height to the parent so the iframe
 *    auto-sizes to its full content.
 * 2. On sp-print message — calls window.print() on itself. This avoids the
 *    cross-frame security restriction that blocks parent.contentWindow.print().
 */
document.addEventListener('sp:ready', function () {
  var height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: 'sp-ready', height: height }, '*');
});

window.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'sp-print') {
    window.print();
  }
});
