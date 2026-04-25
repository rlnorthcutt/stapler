/**
 * demo.js
 * Wires up the print button and auto-sizes the demo iframe once the
 * document inside it has finished rendering.
 */
(function () {
  'use strict';

  var frame = document.querySelector('.demo-iframe');
  var printBtn = document.querySelector('.print-btn');

  // Print button — tells the iframe document to trigger its own print dialog.
  // postMessage is used instead of frame.contentWindow.print() because browsers
  // block cross-frame print() calls in some security contexts (e.g. file://).
  if (printBtn && frame) {
    printBtn.addEventListener('click', function (e) {
      e.preventDefault();
      frame.contentWindow.postMessage({ type: 'sp-print' }, '*');
    });
  }

  // Resize iframe to its full rendered height once the library fires sp:ready
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'sp-ready' && frame) {
      frame.style.height = (e.data.height + 48) + 'px';
    }
  });
}());
