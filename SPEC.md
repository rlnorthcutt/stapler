# Stapler — Technical Specification

A zero-dependency, vanilla web component library for rendering print-accurate multi-page
documents in the browser. Brand-agnostic: the library provides layout structure only;
all visual styling belongs to the author.

> **Note:** `ebook-spec.md` is an older draft describing a different architecture
> (overlay masking, `beforeprint` DOM transformation). It has been superseded by this
> document. The current implementation uses physical spacers and CSS-only print.

---

## Table of Contents

1. [Goals & Non-Goals](#1-goals--non-goals)
2. [Delivery & Build](#2-delivery--build)
3. [Component API](#3-component-api)
4. [Rendering Modes](#4-rendering-modes)
5. [Feature Parity Contract](#5-feature-parity-contract)
6. [CSS Architecture](#6-css-architecture)
7. [Layout Models](#7-layout-models)
8. [Build Sequence](#8-build-sequence)
9. [Measurement & Coordinate System](#9-measurement--coordinate-system)
10. [Print Support](#10-print-support)
11. [Public Methods & Events](#11-public-methods--events)
12. [Known Limitations](#12-known-limitations)
13. [Future Work](#13-future-work)

---

## 1. Goals & Non-Goals

### Goals

- Render multi-page documents in the browser at print-accurate dimensions (8.5×11in, A4, etc.)
- Stamp a single header/footer template onto every page automatically, with per-page skip control
- Support three content models: hard-clipped explicit pages, flow with page-spacer hints, and pure free flow
- All three modes support headers, footers, page numbers, page gaps, and print output
- Be completely brand-agnostic — the library adds no colors, fonts, or visual opinions
- Work as a drop-in `<script src="stapler.js">` with no build step, no npm, no runtime dependencies
- Optimized for reliable AI-generated HTML — explicit, unambiguous attribute contracts

### Non-Goals

- Mixing explicit and flow modes in a single `<stapled-doc>` instance
- Server-side rendering or PDF export (use headless Chrome / browser Print to PDF)
- Auto-reflowing text at the word or character level across pages (block-level flow only)
- Mid-paragraph splitting — content moves as whole blocks
- Compatibility with IE or legacy Edge
- Shadow DOM isolation in the default (non-embed) mode — Light DOM only so authors have full CSS access to header/footer content
- Complex CSS pagination (`@page` counters, running elements) — that is Paged.js territory

---

## 2. Delivery & Build

### Runtime output

```
dist/
  stapler.js      — unminified build (readable, for debugging)
  stapler.min.js  — minified build (for production use)
```

Both files are committed to the repo. Authors reference whichever suits them:

```html
<script src="stapler.js"></script>       <!-- development / readable -->
<script src="stapler.min.js"></script>   <!-- production -->
```

The compiled output is a self-registering IIFE with no exports and no external dependencies.

### Development stack (compile-time only, not shipped)

| Tool | Purpose |
|------|---------|
| TypeScript | Type safety, strict mode |
| esbuild | Compiles `src/stapler.ts` → IIFE, no exports |
| Vitest + happy-dom | Unit tests against a simulated DOM |

### Source layout

```
src/
  stapler.ts        — entry point: injects CSS, registers all custom elements
  css.ts                  — injected structural styles as a template literal
  components/
    StapledPages.ts  — <stapled-doc> — orchestrator, public API
    SPage.ts              — <s-page>        — explicit page container
    PageHeader.ts         — <page-header>   — header template element
    PageFooter.ts         — <page-footer>   — footer template element
    PageSlot.ts           — shared base class for PageHeader / PageFooter
    PageSpacer.ts         — <page-spacer>    — flow-mode bridging spacer
    PageNumber.ts         — <page-number>   — inline page-number placeholder
  utils/
    parseToPx.ts          — CSS length → px conversion (pure function)
    measureHeight.ts      — off-screen template height measurement
    waitForAssets.ts      — fonts.ready + img.decode() timing fence
tests/
  parseToPx.test.ts
  measureHeight.test.ts
  waitForAssets.test.ts
  pageNumber.test.ts
  pageBreak.test.ts
  buildExplicit.test.ts
  buildFlow.test.ts
dist/
  stapler.js        — unminified compiled output (committed)
  stapler.min.js    — minified compiled output (committed)
ebook-demo.html           — reference demo, all three modes
ebook-sample.html         — HAProxy brand sample (explicit mode, 3 pages)
```

### Build commands

```bash
npm run build        # → dist/stapler.js + dist/stapler.min.js
npm run dev          # watch mode with inline sourcemaps
npm run test         # run all tests once
npm run test:watch   # watch mode tests
npm run typecheck    # type-check without compiling
```

---

## 3. Component API

### `<stapled-doc>`

Parent wrapper. Detects or reads rendering mode, orchestrates all child processing,
builds the final DOM structure, and manages refresh lifecycle.

| Attribute     | Type                                | Default     | Description |
|---------------|-------------------------------------|-------------|-------------|
| `mode`        | `"explicit"` \| `"flow"`           | auto-detect | **Required for AI-generated documents.** Explicit = `<s-page>` children. Flow = freeform content. |
| `page-width`  | CSS length                          | `8.5in`     | Width of each page |
| `page-height` | CSS length                          | `11in`      | Height of each page |
| `page-gap`    | CSS length                          | `2rem`      | Visual gap between pages |
| `embed`       | Boolean attribute                   | false       | Activates embed mode — see §4a |
| `stylesheet`  | URL or comma-separated URLs         | —           | Author CSS loaded into the shadow root (embed mode only) |

Auto-detection fallback (human-authored HTML only): `<s-page>` children → explicit;
`<page-spacer>` present → flow-breaks; neither → pure flow.

### `<page-header>` and `<page-footer>`

Defined **once** as direct children of `<stapled-doc>`. Treated as templates —
cloned into every page, then removed from the DOM. Authors style them freely.

Both share the same attribute API via the `PageSlot` base class:

| Attribute    | Type              | Default | Description |
|--------------|-------------------|---------|-------------|
| `height`     | CSS length        | auto    | If provided, used directly. If omitted, measured via off-screen clone. |
| `skip-first` | Boolean attribute | false   | Suppress on page 1 |
| `skip-pages` | `"1,3,5"`         | —       | Comma-separated 1-indexed page numbers to suppress |

### `<s-page>` *(explicit mode only)*

A hard-clipped page container. Content that overflows is hidden. The author is
responsible for content fitting within `page-height − header-height − footer-height`.

| Attribute     | Type       | Default                | Description |
|---------------|------------|------------------------|-------------|
| `skip-header` | Boolean    | false                  | Suppress header on this specific page |
| `skip-footer` | Boolean    | false                  | Suppress footer on this specific page |
| `page-width`  | CSS length | from `<stapled-doc>` | Per-page override (e.g. landscape inserts) |
| `page-height` | CSS length | from `<stapled-doc>` | Per-page override |

### `<page-spacer>` *(flow mode only)*

Forces subsequent content to start at the next page's content area. Its height is
computed at build time to bridge from the current position to the start of the next
page's content area, accounting for footer, gap, and header zones.

Renders a faint dashed top border as an authoring aid; hidden in print. No attributes.

### `<page-number>`

Inline placeholder used inside `<page-header>` or `<page-footer>` templates. Resolved
per-clone when stamped. Renders `?` as a fallback outside a `<stapled-doc>` context.

| `format` value | Output |
|----------------|--------|
| `n` *(default)*| `3` |
| `n/total`      | `3 / 8` |
| `n of total`   | `3 of 8` |
| `total`        | `8` |

---

## 4. Rendering Modes

### Mode detection

Mode is determined by the `mode` attribute on `<stapled-doc>`. If omitted:
- `<s-page>` children present → `explicit`
- `<page-spacer>` anywhere in subtree → `flow-breaks`
- Neither → `flow`

**AI-generated documents must always set `mode` explicitly.**

### Mode 1 — Explicit Pages (`mode="explicit"`)

Each `<s-page>` is a rigid container (`overflow: hidden`). Nothing bleeds between pages.
Headers and footers are cloned inside each page via a flex-column layout. Page gaps come
from CSS `margin` on `<s-page>`.

**Best for:** solution briefs, pitch decks — any document where the author controls
layout precisely and knows content fits within each page.

**Print behavior:** `break-after: page` on each `<s-page>`.

### Mode 2 — Flow with Page Breaks (`mode="flow"`, `<page-spacer>` elements present)

Content flows in a single continuous column. Each `<page-spacer>` element's height is
computed to bridge from the current position to the next page's content area start —
physically filling the footer zone, gap zone, and header zone so no content is masked.

Headers and footers are absolutely positioned in a frame layer that overlays the spacer
zones. No content is ever hidden.

**Best for:** technical guides, articles with explicit chapter separations.

**Print behavior:** `break-after: page` on each `<page-spacer>` element.

### Mode 3 — Pure Flow (`mode="flow"`, no `<page-spacer>` elements)

Content flows freely. The library walks block-level children, identifies which ones
cross a page boundary, and inserts invisible spacer divs before them to push them into
the next page's content area. No content is ever masked.

**Best for:** long-form content (checklists, reports) where page breaks fall naturally.

**Print behavior:** `break-after: page` on each injected `.sp-page-spacer`.

---

## 4a. Embed Mode

### Purpose

When `<stapled-doc>` is dropped into a pre-existing webpage (not an iframe), the host
page's CSS can collide with stapler's structural rules in both directions:

- **Inward**: host `h1`, `p`, `a` etc. rules cascade into page headers/footers and content areas
- **Outward**: stapler structural CSS (injected into `<head>`) is global and could be affected by
  high-specificity host rules

Embed mode uses Shadow DOM to create a complete CSS isolation boundary. The document's
HTML remains in the real DOM (visible to search crawlers and LLM bots), but styled
independently of the host page.

### Activation

```html
<stapled-doc embed page-width="8.5in" page-height="11in" stylesheet="my-doc.css">
  …pages…
</stapled-doc>
```

### What changes in embed mode

1. A shadow root is attached to `<stapled-doc>` (`mode: 'open'`).
2. Stapler's structural CSS is injected as a `<style>` inside the shadow root (not `<head>`).
3. All light-DOM children (`<page-header>`, `<s-page>`, etc.) are moved into the shadow root,
   giving them shadow CSS isolation while keeping their HTML in the real DOM for crawlability.
4. Author CSS is loaded inside the shadow root — not the host page.

### Author CSS injection

Two mechanisms, usable together:

**`stylesheet` attribute** — comma-separated list of URLs loaded as `<link>` elements in the shadow root:

```html
<stapled-doc embed stylesheet="doc-base.css, brand.css">
```

**Inline `<style>` / `<link>` children** — placed as children of `<stapled-doc>` before the pages; moved into the shadow root automatically:

```html
<stapled-doc embed>
  <link rel="stylesheet" href="doc-base.css">
  <style>s-page { border: 1px solid #ddd; }</style>
  <s-page>…</s-page>
</stapled-doc>
```

### Crawlability note

The shadow root is opened (`mode: 'open'`), and all page content elements are real DOM nodes —
not slotted. Google and modern headless browsers process open shadow DOM. For LLM crawlers
that fetch raw HTML only, the custom element tags and their text content are present in the
document source regardless of shadow DOM.

### What does NOT change in embed mode

- Build logic, teardown, refresh, and all rendering behavior are identical.
- The `@page` print rule is still injected into `document.head` (it is always document-global).
- `sp:ready` fires normally on the `<stapled-doc>` element.

---

## 5. Feature Parity Contract

| Feature | Explicit | Flow+Breaks | Pure Flow |
|---------|:--------:|:-----------:|:---------:|
| Header stamped per page | ✓ | ✓ | ✓ |
| Footer stamped per page | ✓ | ✓ | ✓ |
| `skip-first` on header/footer | ✓ | ✓ | ✓ |
| `skip-pages` on header/footer | ✓ | ✓ | ✓ |
| `<page-number>` formats | ✓ | ✓ | ✓ |
| Page gap between pages | ✓ | ✓ | ✓ |
| No content masked or hidden | ✓ | ✓ | ✓ |
| Print / PDF output | ✓ | ✓ | ✓ |
| `sp:ready` event | ✓ | ✓ | ✓ |
| `refresh()` method | ✓ | ✓ | ✓ |
| `skip-header` / `skip-footer` per page | ✓ | — | — |
| Per-page size overrides | ✓ | — | — |

---

## 6. CSS Architecture

One `<style id="sp-core-styles">` block is injected into `<head>` on first load.
Guarded by ID check to prevent double-injection when multiple instances exist.

**Structural rules only — no colors, fonts, padding, or visual opinions.**

### Injected rules

| Selector | Key properties | Purpose |
|----------|----------------|---------|
| `stapled-doc` | `display: block; position: relative` | Host element |
| `s-page` | `display: flex; flex-direction: column; overflow: hidden; position: relative; margin: var(--sp-page-gap) auto; box-shadow: var(--sp-frame-shadow)` | Explicit mode page. `position: relative` allows author content to use `position: absolute` inside the page. |
| `.sp-page-content` | `flex: 1; min-height: 0; overflow: hidden; position: relative` | Content area between header/footer in explicit mode |
| `s-page > page-header, s-page > page-footer` | `display: block; flex-shrink: 0; width: 100%` | Header/footer inside explicit `<s-page>` |
| `stapled-doc > page-header, stapled-doc > page-footer` | `display: none` | Hides templates until JS processes them |
| `.sp-flow-wrapper` | `position: relative; width: 100%` | Flow mode content wrapper |
| `.sp-page-spacer` | `display: block; width: 100%` | Physical spacer injected at page boundaries |
| `.sp-frame-layer` | `position: absolute; inset: 0; pointer-events: none` | Absolutely-positioned header/footer layer in flow modes |
| `.sp-page-frame` | `position: absolute; left: 0; right: 0` | Per-page container in frame layer |
| `.sp-frame-header, .sp-frame-footer` | `position: absolute; left: 0; right: 0; pointer-events: all` | Header/footer wrappers in frame layer |
| `page-spacer` | `display: block; border-top: 1.5px dashed rgba(0,0,0,.18); overflow: hidden` | Page break indicator (height set by JS) |
| `page-number` | `display: inline` | Inline placeholder |
| `@media print` | See §10 | Print overrides |

### CSS custom properties (on `<stapled-doc>`)

| Property | Default | Description |
|----------|---------|-------------|
| `--sp-page-gap` | set from `page-gap` attribute | Gap between pages |
| `--sp-frame-shadow` | `0 4px 20px rgba(0,0,0,.12)` | Box-shadow on page frames |

---

## 7. Layout Models

### Explicit Mode

```
<stapled-doc>  (display: block)
  <s-page>  (flex column, width × height, overflow: hidden, position: relative, margin: gap auto)
    <page-header>   flex-shrink: 0  — cloned from template
    <div class="sp-page-content">   flex: 1; overflow: hidden; position: relative
      [original <s-page> children moved here]
    </div>
    <page-footer>   flex-shrink: 0  — cloned from template
  </s-page>
  ...
```

No frame layer. Headers/footers live in the DOM inside each `<s-page>`.
`position: relative` on both `<s-page>` and `.sp-page-content` allows author content
to safely use `position: absolute` (e.g. a corner watermark or absolute-positioned CTA).

### Flow Modes

```
<stapled-doc>  (position: relative, width: pageW, margin: auto)

  .sp-flow-wrapper  (position: relative)
    [padding-top: headerH]                 ← reserves first page's header zone
    [user content as direct children]
    [<page-spacer> elements]                ← flow-with-breaks: heights set by JS
    [<div class="sp-page-spacer"> ...]     ← pure flow: injected by _injectPageSpacers
    [padding-bottom: fill]                 ← pads last page to N×slotH − gapH boundary

  .sp-frame-layer  (position: absolute, inset: 0, pointer-events: none)
    .sp-page-frame  (per page, top: i × slotH, height: pageH)
      .sp-frame-header  (position: absolute, top: 0, height: headerH)
        <page-header clone>
      .sp-frame-footer  (position: absolute, bottom: 0, height: footerH)
        <page-footer clone>
    ...
```

Where `slotH = pageH + gapH`.

No masking. Spacers and `<page-spacer>` elements physically occupy footer/gap/header
zones, so no user content is ever positioned behind an overlay.

---

## 8. Build Sequence

### Timing fence

`connectedCallback` defers `_build()` until:
1. `DOMContentLoaded` has fired (or document is already interactive/complete)
2. `document.fonts.ready` resolves
3. All `<img>` descendants have decoded via `img.decode()`

All three are awaited via `Promise.all` before any measurement occurs. One
`requestAnimationFrame` is then used to ensure the browser has performed at least one
layout pass.

### Explicit Mode Build

1. Read `page-width`, `page-height`, `page-gap`; convert to px via `parseToPx`
2. Set `--sp-page-gap` CSS custom property on `<stapled-doc>`
3. Find `<page-header>` and `<page-footer>` direct children; store references
4. Measure `headerH` and `footerH` via `measureHeight()` (see §9)
5. Collect all `<s-page>` direct children
6. For each `<s-page>` (1-indexed):
   a. Compute width/height: per-page attribute override or fall back to `<stapled-doc>` value
   b. Set `width` and `height` as inline styles
   c. Wrap all existing children in `<div class="sp-page-content">` (the flex:1 content area)
   d. If header not skipped (`skip-header` absent and `isVisibleOnPage` true): clone template, strip control attributes (`height`, `skip-first`, `skip-pages`), set inline height, resolve `<page-number>` elements, `prepend` to `<s-page>`
   e. If footer not skipped: same as above, `append` to `<s-page>`
7. `remove()` original template elements from DOM
8. Dispatch `sp:ready`

### Flow Mode Build

1. Read `page-width`, `page-height`, `page-gap`; convert to px
2. Compute `slotH = pageH + gapH`
3. Find `<page-header>` and `<page-footer>` direct children; store references; `remove()` them from DOM
4. Measure `headerH` and `footerH` via `measureHeight()` (measurements taken before removal)
5. Wrap all remaining `<stapled-doc>` children in `<div class="sp-flow-wrapper">`
6. Set `<stapled-doc>` to `position: relative; width: pageW; margin: auto`
7. Set `wrapper.style.paddingTop = headerH` (reserves first page's header zone)
8. Detect sub-mode: `<page-spacer>` anywhere in subtree → `flow-breaks`; else → `flow`
9. **If `flow-breaks`:** call `_processPageBreaks(wrapper, slotH, pageH, headerH, footerH)` — see below
10. Wait one `requestAnimationFrame` for layout to settle after page-spacer heights are set
11. In `_finaliseFlow()`:
    a. **If pure `flow`:** call `_injectPageSpacers(wrapper, slotH, headerH, footerH, gapH)` — see below
    b. Measure `wrapper.offsetHeight` (reflects final state, post-spacer-injection for pure flow)
    c. Compute `numPages = max(1, ceil(rawH / slotH))`
    d. Compute `padBottom = numPages × slotH − gapH − wrapper.offsetHeight`; apply if > 0
    e. Set `<stapled-doc>` height to `numPages × slotH − gapH`
    f. Call `_buildFrameLayer(numPages, slotH, pageH, headerH, footerH)`
    g. Dispatch `sp:ready`

### Page Break Processing (`_processPageBreaks`)

Processes `<page-spacer>` elements in DOM order, **sequentially — never batched**:

For each `<page-spacer>` element:
1. Set `pb.style.height = '0'` (reset so the next read is unaffected by a prior value)
2. Call `pb.getBoundingClientRect()` to read current position (forces synchronous layout)
3. `flowY = pb.top − wrapper.top`
4. `pageIndex = floor(flowY / slotH)`
5. `nextContentStart = (pageIndex + 1) × slotH + headerH`
6. `pb.style.height = max(0, nextContentStart − flowY)`

This must remain sequential (set → read → set). Each height change shifts the DOM
position of every subsequent element. Reading all positions first and setting all heights
second produces wrong results. See CLAUDE.md.

### Pure Flow Spacer Injection (`_injectPageSpacers`)

Walks direct children of the flow wrapper in DOM order. Tracks `nextBoundaryPage` (starts
at 1). For each child:

1. Read `childTop = child.getBoundingClientRect().top − wrapper.getBoundingClientRect().top`
2. `contentZoneEnd = nextBoundaryPage × slotH − footerH − gapH`
3. If `childTop + childHeight > contentZoneEnd` (child crosses into the footer/gap zone):
   - `nextContentStart = nextBoundaryPage × slotH + headerH`
   - `spacerH = nextContentStart − childTop`
   - If `spacerH > 0`: inject `<div class="sp-page-spacer" style="height: Xpx">` before the child; update `childTop = nextContentStart`
   - `nextBoundaryPage++`
4. Advance `nextBoundaryPage` past any additional zone boundaries the child's bottom crosses (handles children taller than one content zone)

One spacer per child maximum. Multiple zone advances are handled by the trailing `while` loop.

### Frame Layer Build (`_buildFrameLayer`)

For each page `i` (0-indexed):
1. Create `.sp-page-frame` at `top: i × slotH`, `height: pageH`
2. If header visible on page `i+1`: create `.sp-frame-header` (`height: headerH`); clone template, strip control attributes, resolve `<page-number>`; append
3. If footer visible on page `i+1`: create `.sp-frame-footer` (`height: footerH`); clone template, strip control attributes, resolve `<page-number>`; append
4. Append frame to `.sp-frame-layer`

---

## 9. Measurement & Coordinate System

### Unit Conversion (`parseToPx`)

| Unit | Conversion |
|------|-----------|
| `px` | × 1 |
| `in` | × 96 |
| `cm` | × 37.7952756 |
| `mm` | × 3.77952756 |
| `pt` | × 96/72 |
| `rem` | × computed root font size |
| `em`  | × computed element font size |

Returns a `number` (CSS pixels). Throws on unrecognized units.

### Template Height Measurement (`measureHeight`)

1. If `height` attribute is present: parse via `parseToPx` and return immediately (no DOM work)
2. Otherwise:
   - Clone template into a `position: fixed; top: -9999px; visibility: hidden; width: pageWpx` container
   - Append to `<body>`, read `container.offsetHeight`, remove container
   - Return value

Providing `height` explicitly is always faster and more reliable. It is strongly recommended
for AI-generated documents.

### Flow Mode Coordinate System

Content coordinates and visual coordinates are 1:1 — no transforms or scaling. `flowY`
(distance from top of flow wrapper) equals visual Y.

```
Slot N  [N×slotH … (N+1)×slotH):
  [N×slotH,                 N×slotH + headerH)          → header zone
  [N×slotH + headerH,       N×slotH + pageH − footerH)  → content zone (visible to reader)
  [N×slotH + pageH−footerH, N×slotH + pageH)            → footer zone
  [N×slotH + pageH,         (N+1)×slotH)                → gap zone (absent on last page)
```

Spacers and `<page-spacer>` elements physically occupy header/footer/gap zones.
The content zone is always unobstructed.

---

## 10. Print Support

Print is handled entirely via CSS — no `beforeprint` DOM transformation is needed.

### Explicit Mode

Each `<s-page>` gets `break-after: page`. Headers and footers are part of the page DOM
and print with the content. Injected print CSS:

```css
@media print {
  body { background: white !important; }
  s-page {
    break-after: page;
    box-shadow: none !important;
    margin: 0 !important;
  }
  .sp-frame-layer { display: none !important; }  /* not used in explicit mode, but defensive */
}
```

### Flow Modes

Physical spacers and `<page-spacer>` elements provide `break-after: page` points that
the browser's print engine respects natively. The frame layer is hidden in print
(headers/footers are physically in the spacer zones via `padding-top` and the flow).

```css
@media print {
  body { background: white !important; }
  .sp-page-spacer {
    break-after: page;
    visibility: hidden;
  }
  page-spacer {
    break-after: page;
    visibility: hidden;
  }
  .sp-frame-layer { display: none !important; }
  page-spacer { border-top: none; }
}
```

### Author-supplied `@page` rule

The library does not inject `@page` because it does not own the document's print settings.
Authors must add this to their stylesheet for correct print dimensions:

```css
@page {
  size: 8.5in 11in;   /* match page-width × page-height on <stapled-doc> */
  margin: 0;
}
```

The `sp:ready` event detail includes `pageWidth` and `pageHeight` in px for programmatic use.

---

## 11. Public Methods & Events

### `refresh()`

Re-runs the full build sequence. Tears down prior output cleanly before rebuilding.

**Explicit mode teardown:**
- Re-insert stored template references into the DOM
- For each `<s-page>`: remove cloned `<page-header>` and `<page-footer>` children; unwrap `.sp-page-content` (move children back to `<s-page>`); reset inline `width`/`height`
- Run `_build()`

**Flow mode teardown:**
- Remove `.sp-frame-layer`
- Re-insert stored template references into the flow wrapper
- Remove `.sp-page-spacer` elements; reset `<page-spacer>` heights
- Unwrap `.sp-flow-wrapper` (restore children to `<stapled-doc>`)
- Reset inline styles on `<stapled-doc>` (`width`, `height`, `margin`, `position`)
- Run `_build()`

### `sp:ready` event

Fired on `<stapled-doc>` after each successful build (including after `refresh()`). Bubbles.

```ts
detail: {
  pageCount: number,                              // total pages rendered
  mode: "explicit" | "flow-breaks" | "flow",     // detected render mode
  pageWidth: number,                              // px
  pageHeight: number,                             // px
}
```

---

## 12. Known Limitations

### Pure flow: block-level granularity only

Spacers are injected before the first block-level child whose bottom edge crosses a page
boundary. A block taller than the available content area on its page is moved to the next
page in its entirety, leaving whitespace at the bottom of the previous page. Mid-block
splitting is not supported. Authors who need precise control should use explicit mode or
add `<page-spacer>` elements.

### Dynamic content after build

Content added after `sp:ready` does not automatically re-paginate. Call `refresh()` after
any meaningful DOM change.

### Font and image timing

The build waits for `document.fonts.ready` and `img.decode()` on all descendant images.
Fonts loaded via `@import` in external stylesheets after `DOMContentLoaded` may not be
ready in time. Provide the `height` attribute on `<page-header>` and `<page-footer>`
to eliminate this risk, or call `refresh()` after confirming fonts are loaded.

### Flow mode: uniform page dimensions only

Per-page size overrides (`page-width`, `page-height` on `<s-page>`) are supported in
explicit mode only. Flow modes assume uniform page dimensions throughout.

---

## 13. Future Work

### Near-term

**`sp:overflow` event (explicit mode)** — Fire when an `<s-page>`'s content overflows
its bounds (i.e. the rendered height of `.sp-page-content` exceeds the available content
area). Lets AI-generation pipelines detect when a page was overfilled and trigger
a retry or reflow. Implementation: compare `scrollHeight` vs `clientHeight` on
`.sp-page-content` after build.

**Auto-refresh on resize** — Attach a `ResizeObserver` to `<stapled-doc>` and call
`refresh()` automatically when the container width changes. Currently authors must call
`refresh()` manually. Opt-in via an `auto-refresh` attribute to avoid unnecessary work
in static documents.

**Paper size presets** — `<stapled-doc size="letter|a4|a5|half-letter|legal">` as a
convenience shorthand. Translates to the equivalent `page-width` + `page-height` values.
`page-width` / `page-height` always take precedence if present.

**Variable header content per section (flow mode)** — Allow the frame layer header to
display different content per page range (e.g. chapter titles). Likely implemented via
a `<page-section title="...">` marker element that associates a title with a position
in the flow, resolved when building each page's frame.

### Longer-term

**Multi-column flow** — `<stapled-doc columns="2">` for two-column layout per page.
Requires column-aware boundary detection in `_injectPageSpacers` and a two-column frame
structure. Significant complexity — revisit once the single-column model is fully stable.

**`break-inside: avoid` equivalent** — An attribute on block elements (e.g. callout boxes,
images) marking them as must-not-split in pure flow mode. Currently the spacer is already
inserted before the first crossing element, which achieves this implicitly. An explicit
attribute would make the contract clear and handle the edge case where a large element
is the second child on a page.