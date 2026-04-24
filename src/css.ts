/**
 * Structural CSS injected into <head> once on first load.
 * No colors, fonts, padding, or visual opinions on header/footer content.
 * Authors supply all brand styling themselves.
 */
export const CORE_CSS = `
/* ── Host ──────────────────────────────────────────────── */
stapled-pages {
  display: block;
  position: relative;
}

/* ── Explicit mode: page container ─────────────────────── */
s-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  margin: var(--sp-page-gap, 2rem) auto;
  box-shadow: var(--sp-frame-shadow, 0 4px 20px rgba(0,0,0,.12));
}

/* Content area between header and footer */
.sp-page-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

/* Header / footer inside explicit s-page */
s-page > page-header,
s-page > page-footer {
  display: block;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

/* Hide template elements (direct children of stapled-pages) until JS processes them */
stapled-pages > page-header,
stapled-pages > page-footer {
  display: none;
}

/* ── Flow mode: content wrapper ─────────────────────────── */
.sp-flow-wrapper {
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

/* Physical spacers injected at page boundaries */
.sp-page-spacer {
  display: block;
  width: 100%;
  flex-shrink: 0;
}

/* ── Flow mode: frame layer (headers/footers overlay) ───── */
.sp-frame-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.sp-page-frame {
  position: absolute;
  left: 0;
  right: 0;
}

.sp-frame-header,
.sp-frame-footer {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: all;
  box-sizing: border-box;
}

.sp-frame-header {
  top: 0;
}

.sp-frame-footer {
  bottom: 0;
}

/* ── Page break indicator (flow mode) ───────────────────── */
page-break {
  display: block;
  overflow: hidden;
  border-top: 1.5px dashed rgba(0, 0, 0, .18);
  box-sizing: border-box;
}

/* ── Page number placeholder ────────────────────────────── */
page-number {
  display: inline;
}

/* ── Print ──────────────────────────────────────────────── */
@media print {
  body {
    background: white !important;
  }

  /* Explicit mode: each s-page is one printed page */
  s-page {
    break-after: page;
    box-shadow: none !important;
    margin: 0 !important;
  }

  /* Flow mode: spacers and page-breaks trigger print page breaks */
  .sp-page-spacer {
    break-after: page;
    visibility: hidden;
  }

  page-break {
    break-after: page;
    visibility: hidden;
  }

  /* Frame layer not needed in print — headers/footers are in the content */
  .sp-frame-layer {
    display: none !important;
  }

  /* Page break authoring aid border not needed in print */
  page-break {
    border-top: none;
  }
}
`
