# Changelog

## Unreleased

### Changed

- **`page-width`/`page-height` no longer abort the build.** Omitting either still logs a `console.error`, but now falls back to `8.5in`/`11in` instead of preventing the document from rendering.
- **`height` on `<page-header>`/`<page-footer>` no longer aborts the build.** Omitting it still logs a `console.error`, but now falls back to `24px` instead of preventing the document from rendering.

## [0.5.0] — 2026-04-27

### Breaking Changes

- **Flow mode removed.** `mode="flow"`, `mode="flow-breaks"`, and `<page-spacer>` have been removed. Using `mode="flow"` now logs a migration error and prevents rendering. Pin to 0.4.x if you need flow mode.
- **`mode` attribute removed.** There is only one rendering mode (explicit). Remove `mode="explicit"` from your markup; `mode="flow"` now produces a deprecation error.
- **`page-width` and `page-height` are required.** Previously they defaulted to `8.5in`/`11in`. Now a missing attribute is a console error.
- **`sp:ready` event `detail.mode` removed.** Detail now contains only `pageCount`, `pageWidth`, `pageHeight`.

### New Features

- **`<s-page-body>`** — dedicated body slot inside `<s-page>`. Style it with padding, max-width, overflow. Auto-created (with `data-sp-autowrap`) if an `<s-page>` has no explicit `<s-page-body>`.

### Why

Flow mode's JS-measured layout diverges from browser print pagination when styling gets non-trivial. There is no reliable way to reconcile the two. Explicit mode is the sound primitive — the author controls what's on each page, and the browser renders it faithfully.

---

## 0.4.0 — 2026-04-27

### Breaking changes

- **`mode` attribute is now required** on `<stapled-doc>`. Auto-detection from child element types has been removed. Documents without `mode` will log a `console.error` and abort rendering.
- **`height` attribute is now required** on `<page-header>` and `<page-footer>`. Off-screen clone measurement has been removed. Templates without `height` will log a `console.error` and abort rendering.
- **Auto-detection removed.** Previously, omitting `mode` caused the library to infer it from child elements. This fallback is gone.

### New features

- **Auto `@page` rule.** The library now injects `@page { size: <width> <height>; margin: 0; }` into `<head>` at build time. Authors no longer need to add this manually for PDF output. The rule is replaced on each `refresh()`.
- **Per-page header/footer override (explicit mode).** An `<s-page>` can contain its own `<page-header>` or `<page-footer>` as a direct child. When present it overrides the document-level template for that page only. `skip-first` / `skip-pages` on the document template still apply to pages without an override.
- **`preview="print"` attribute on `<stapled-doc>`.** Renders the on-screen view as the printed PDF will look: no page gap, no shadows, white background. Use during layout iteration to avoid repeated print previews.
- **`page-break-after: always`** added to the print CSS for `<s-page>` alongside the existing `break-after: page` for broader browser compatibility.

### Internal

- `measureHeight()` simplified: off-screen clone path removed, `pageWidth` parameter dropped.
- `_detectMode()` simplified: auto-detect fallback removed.

---

## 0.1.0 — initial release
