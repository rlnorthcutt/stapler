# ebook.js — Web Component Library Spec v2

A zero-dependency, vanilla web component library for rendering print-accurate ebooks,
solution briefs, and multi-page documents in the browser. Brand-agnostic: the library
provides layout structure only; all visual styling belongs to the author.

---

## Table of Contents

1. [Goals & Non-Goals](#1-goals--non-goals)
2. [File Structure](#2-file-structure)
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
- Support three content models: hard-clipped explicit pages, soft page-break hints, and pure free flow
- **All three modes must have identical feature support** — page gaps, headers, footers, print output
- Be completely brand-agnostic — the library adds no colors, fonts, or visual opinions
- Work as a drop-in `<script src="ebook.js">` with no build step, no npm, no framework

### Non-Goals

- Mixing explicit and flow modes in a single `<e-book>` instance
- Server-side rendering or PDF export (use headless Chrome for PDF)
- Auto-reflowing text across pages like a native word processor
- Compatibility with IE or legacy Edge
- Shadow DOM isolation (Light DOM only; authors need full CSS access to header/footer content)

---

## 2. File Structure

```
ebook.js            — Single-file library (components + injected CSS)
ebook-demo.html     — Reference demo showing all three modes
```

The library is intentionally one file. Structural CSS is injected into `<head>` on first
load, guarded by an id check to prevent double-injection.

---

## 3. Component API

### `<e-book>`

Parent wrapper. Detects rendering mode, orchestrates all child processing, builds
the final DOM structure, and manages print lifecycle.

| Attribute     | Type       | Default  | Description |
|---------------|------------|----------|-------------|
| `page-width`  | CSS length | `8.5in`  | Width of each page |
| `page-height` | CSS length | `11in`   | Height of each page |
| `page-gap`    | CSS length | `2rem`   | Gap between pages — works in all modes |

---

### `<book-header>`

Defined once as a direct child of `<e-book>`. Treated as a template — cloned into every
page, then removed from the DOM. Authors style it freely with their own CSS. The library's
CSS applies `display: none` to direct children of `<e-book>` until JS clones and removes
them — the rule stops applying to clones automatically.

| Attribute    | Type       | Default | Description |
|--------------|------------|---------|-------------|
| `height`     | CSS length | auto    | Applied as inline height on every stamped clone. If omitted, height is measured by rendering a hidden clone. |
| `skip-first` | Boolean    | false   | Suppress header on page 1 |
| `skip-pages` | `"1,3,5"` | —       | Comma-separated 1-indexed page numbers to suppress |

---

### `<book-footer>`

Same template pattern as `<book-header>`.

| Attribute    | Type       | Default | Description |
|--------------|------------|---------|-------------|
| `height`     | CSS length | auto    | Applied as inline height on every stamped clone |
| `skip-pages` | `"1,3"`   | —       | Comma-separated 1-indexed page numbers to suppress |

---

### `<page-number>`

Inline placeholder used inside `<book-header>` or `<book-footer>` templates.
Resolved per-clone when the template is stamped. Renders `?` as a fallback outside
an `<e-book>` context.

| Attribute | Values          | Output |
|-----------|-----------------|--------|
| `format`  | `n` *(default)* | `3` |
|           | `n/total`       | `3 / 8` |
|           | `n of total`    | `3 of 8` |
|           | `total`         | `8` |

---

### `<book-page>` *(Explicit Mode only)*

A hard-clipped page container. Content that overflows is cut off at the page edge.
The author is responsible for content fitting within the available area
`(page-height − header-height − footer-height)`.

| Attribute     | Type       | Default             | Description |
|---------------|------------|---------------------|-------------|
| `skip-header` | Boolean    | false               | Suppress header on this page |
| `skip-footer` | Boolean    | false               | Suppress footer on this page |
| `page-width`  | CSS length | from `<e-book>`     | Per-page override (e.g. landscape inserts) |
| `page-height` | CSS length | from `<e-book>`     | Per-page override |

---

### `<page-break>` *(Flow Modes only)*

Forces subsequent content to start on the next page. Height is computed at build time —
no author styling needed. Renders a faint dashed top border as an authoring aid.
Hidden in print. Has no effect in explicit mode.

No author-facing attributes.

---

## 4. Rendering Modes

Mode is auto-detected at build time. Modes are mutually exclusive per `<e-book>` instance.

### Mode 1 — Explicit Pages

**Trigger:** One or more `<book-page>` direct children exist.

Each `<book-page>` is a rigid container with `overflow: hidden`. Nothing bleeds between
pages. Headers and footers are cloned into each page and positioned via a flex column
layout inside the page. Visual page gaps come from CSS `margin` on `book-page`.

Best for: solution briefs, pitch decks — any document where precise layout control
matters and the author knows the content fits.

### Mode 2 — Flow with Page Breaks

**Trigger:** No `<book-page>` children, but `<page-break>` elements are present.

Content flows as a single continuous column. Each `<page-break>` fills the remaining
content area of its current page AND the following footer zone, gap zone, and header
zone — pushing the next content element to the start of the next page's content area.
Headers and footers are stamped via an overlay layer. Content is not clipped; text
flowing behind header/footer zones is visually masked by their opaque backgrounds.
Visual page gaps are created by gap bar elements in the overlay.

Best for: technical guides, articles with explicit chapter separations.

### Mode 3 — Pure Flow

**Trigger:** No `<book-page>`, no `<page-break>`.

Content flows freely. The component measures total rendered height, calculates page
count, pads the last page to completion, and stamps headers/footers via the overlay.
Visual page separation comes from box-shadow on page frames and optional gap bars.

Best for: long-form content (checklists, reports) where the author doesn't control
where page breaks fall.

---

## 5. Feature Parity Contract

All three modes must support the following features identically. This section is the
authoritative list of what must work the same way regardless of mode.

| Feature | Explicit | Flow+Breaks | Pure Flow | Notes |
|---------|----------|-------------|-----------|-------|
| Header stamped per page | ✓ | ✓ | ✓ | |
| Footer stamped per page | ✓ | ✓ | ✓ | |
| `skip-first` on header | ✓ | ✓ | ✓ | |
| `skip-pages` on header/footer | ✓ | ✓ | ✓ | |
| `<page-number>` formats | ✓ | ✓ | ✓ | |
| Page gap between pages (browser) | ✓ | ✓ | ✓ | See gap strategy per mode below |
| Header/footer in print output | ✓ | ✓ | ✓ | Flow modes via beforeprint conversion |
| Page breaks in print output | ✓ | ✓ | ✓ | Flow modes via beforeprint conversion |
| `ebook:ready` event | ✓ | ✓ | ✓ | |
| `refresh()` public method | ✓ | ✓ | ✓ | |
| Per-page header/footer suppress | ✓ | — | — | `skip-header`/`skip-footer` only make sense in explicit mode |

### Page Gap Strategy Per Mode

**Explicit:** `book-page` has `margin: pageGap auto` via CSS. The gap is real DOM space.

**Flow with breaks:** The `<page-break>` element's height is computed to fill the remaining
content area AND the footer zone, gap zone, and header zone of the next page
(total: `remaining-content + footerH + gapH + headerH`). The overlay includes gap bar
elements between page frames. The result is a physical gap in the content flow that aligns
exactly with the overlay's gap bar positions.

**Pure flow:** Gap bars are placed between page frames in the overlay. Content flows
continuously through the gap zones and is visually hidden by the gap bars. This creates
the same visual appearance as the other modes, with the accepted limitation that content
in the gap zone is masked (not physically absent). See §12.

---

## 6. CSS Architecture

The library injects one `<style id="ebook-core-styles">` block into `<head>` on first
load. Structural rules only — no colors, fonts, padding, or visual opinions on
header/footer content.

### Injected rules

| Selector | Key properties | Purpose |
|----------|----------------|---------|
| `e-book` | `display: block` | Host element |
| `book-page` | `display:flex; flex-direction:column; overflow:hidden; margin:var(--ebook-page-gap) auto; box-shadow` | Explicit mode page container |
| `.book-page-content` | `flex:1; min-height:0; overflow:hidden` | Content area between header/footer in explicit mode |
| `book-header, book-footer` | `display:block; flex-shrink:0; width:100%` | Inside explicit book-pages |
| `e-book > book-header, e-book > book-footer` | `display:none` | Hides templates before JS runs |
| `.ebook-flow-content` | `position:relative; z-index:1; width:100%; background:white` | Flow mode content layer |
| `.ebook-overlay-layer` | `position:absolute; inset:0; pointer-events:none; z-index:10` | Overlay layer (flow modes) |
| `.ebook-page-frame` | `position:absolute; left:0; right:0; box-shadow` | Per-page visual frame |
| `.ebook-frame-header, .ebook-frame-footer` | `position:absolute; left:0; right:0; pointer-events:all` | Opaque header/footer wrappers in overlay |
| `.ebook-gap-bar` | `position:absolute; left:0; right:0; background:var(--ebook-gap-color)` | Gap bars between page frames in flow modes |
| `page-break` | `display:block; overflow:hidden; border-top:1.5px dashed rgba(0,0,0,.18)` | Page break indicator |
| `page-number` | `display:inline` | Inline placeholder |
| `@media print` | See §10 | Print styles |

### CSS custom properties (on `<e-book>`)

| Property | Default | Description |
|----------|---------|-------------|
| `--ebook-page-gap` | `2rem` | Gap between pages (set by `page-gap` attribute) |
| `--ebook-gap-color` | `#d4d8dd` | Background color of gap bars (should match body background) |
| `--ebook-frame-shadow` | subtle box-shadow | Page frame shadow (override to change page edge appearance) |

---

## 7. Layout Models

### Explicit Mode

```
<e-book>  (display: block)
  <book-page>  (flex column, width × height, overflow:hidden, margin:pageGap auto)
    <book-header>   flex-shrink:0, cloned from template
    <div class="book-page-content">   flex:1, min-height:0, overflow:hidden
      [original book-page children moved here by build sequence]
    <book-footer>   flex-shrink:0, cloned from template
  <book-page> ...
  <book-page> ...
```

No overlay layer is used in explicit mode. Headers and footers live in the DOM inside
each `book-page`. Visual gaps are CSS margin. This is the simplest and most print-safe
structure.

### Flow Modes

```
<e-book>  (position:relative, width:pageW, height:N×slotH - gapH)
  .ebook-flow-content   (position:relative, z-index:1, white background)
    padding-top: headerH           ← reserves first page's header zone
    [all user content]
    [<page-break> elements with computed heights — see §9]
    padding-bottom: fill           ← pads last page to N×slotH boundary

  .ebook-overlay-layer  (position:absolute, inset:0, z-index:10, pointer-events:none)
    .ebook-page-frame   (position:absolute, top:0, height:pageH, box-shadow)
      .ebook-frame-header  (position:absolute, top:0, height:headerH, pointer-events:all)
        <book-header clone>  ← opaque background masks content in header zone
      .ebook-frame-footer  (position:absolute, bottom:0, height:footerH, pointer-events:all)
        <book-footer clone>  ← opaque background masks content in footer zone

    .ebook-gap-bar   (position:absolute, top:pageH, height:gapH, background:--ebook-gap-color)
      ← masks content in gap zone; creates visual separation between pages

    .ebook-page-frame   (position:absolute, top:slotH, height:pageH)  ← page 2
      .ebook-frame-header ...
      .ebook-frame-footer ...

    .ebook-gap-bar   (position:absolute, top:slotH+pageH, height:gapH)  ← gap 2

    ... repeated for N pages
```

Where `slotH = pageH + gapH`.

**Masking principle:** Content at z-index 1 renders continuously. The overlay at z-index 10
has `pointer-events:none` globally, but `.ebook-frame-header` and `.ebook-frame-footer`
restore `pointer-events:all` so links/buttons inside them remain functional. The header/footer
clones must have opaque backgrounds (set by the author's CSS) to mask content flowing behind
them. The `.ebook-gap-bar` always has an opaque background (from `--ebook-gap-color`) to
mask content in the inter-page gap zone.

---

## 8. Build Sequence

### Timing

`connectedCallback` schedules `_build()` using:
- `document.fonts.ready` + `Promise.all` on all `<img>` elements' `decode()` promises,
  combined with a `DOMContentLoaded` / `requestAnimationFrame` fence.

This ensures fonts and images are loaded before any height measurement occurs, preventing
stale page count calculations.

### Explicit Mode Build Steps

1. Read `page-width`, `page-height`, `page-gap` from `<e-book>` attributes; convert to px
2. Set `--ebook-page-gap` CSS custom property on `<e-book>`
3. Locate `<book-header>` and `<book-footer>` direct children; read their config
4. Collect all `<book-page>` direct children
5. For each page (1-indexed):
   a. Apply `width` and `height` (with per-page attribute overrides)
   b. Wrap all existing children in `.book-page-content` (flex:1 content area)
   c. If header not skipped: clone template, strip control attrs, set height, resolve `<page-number>`, `prepend`
   d. If footer not skipped: clone template, strip control attrs, set height, resolve `<page-number>`, `append`
6. `remove()` original template elements from DOM
7. Dispatch `ebook:ready`

### Flow Mode Build Steps

1. Read `page-width`, `page-height`, `page-gap` from `<e-book>` attributes; convert to px
2. Compute `slotH = pageH + gapH`
3. Measure `headerH` and `footerH` via `_getTemplateHeight()` (see §9)
4. Wrap all `<e-book>` children in `.ebook-flow-content`; `remove()` templates (keep JS references)
5. Set `<e-book>` to `position:relative; width:pageW; margin:auto`
6. Set `flow.style.paddingTop = headerH`
7. Determine whether `<page-break>` elements exist → sets `mode` in the ready event
8. Call `_processPageBreaks(flow, pageH, gapH, headerH, footerH)`
9. Wait one frame (allow layout to settle after page-break heights are set)
10. Measure `flow.offsetHeight` → `rawH`
11. Compute `numPages = ceil(rawH / slotH)` (using slotH so gaps are counted)
12. Compute `padBottom = numPages * slotH - gapH - rawH` and set on flow (fills last page, no trailing gap)
13. Set `<e-book>` height to `numPages * slotH - gapH`
14. Call `_buildOverlay(numPages, slotH, pageH, gapH, headerH, footerH, headerTpl, footerTpl)`
15. Dispatch `ebook:ready`

### Page Break Processing

Called in step 8 above. Processes `<page-break>` elements in DOM order, sequentially:

For each `<page-break>`:
1. Reset its height to `0`
2. Call `getBoundingClientRect()` to get current Y (forces synchronous layout, accounts for
   prior page-breaks' heights)
3. Compute `flowY = pb.getBoundingClientRect().top - flow.getBoundingClientRect().top`
4. Compute `pageIndex = floor(flowY / slotH)`
5. Compute `contentEnd = pageIndex * slotH + pageH - footerH`
   *(end of content area on current page, just above footer zone)*
6. Compute `nextContentStart = (pageIndex + 1) * slotH + headerH`
   *(start of content area on next page, just after header zone)*
7. Set `pb.style.height = nextContentStart - flowY`
   *(fills: remaining content area + footer zone + gap zone + header zone of next page)*

This ensures that after each page-break, content resumes at exactly the right Y position
for the next page's content area, aligned with the overlay's page frame positions.

For pure flow mode (no `<page-break>` elements), step 8 is a no-op.

### Overlay Build

For each page (1-indexed, `i` = 0-indexed):

1. Create `.ebook-page-frame` at `top: i * slotH`, height `pageH`
2. If header not skipped: create `.ebook-frame-header` wrapper at `top:0, height:headerH`;
   clone template, strip control attrs, resolve page-numbers, append; append wrapper to frame
3. If footer not skipped: create `.ebook-frame-footer` wrapper at `bottom:0, height:footerH`;
   clone template, strip control attrs, resolve page-numbers, append; append wrapper to frame
4. Append frame to overlay
5. If `i < numPages - 1`: create `.ebook-gap-bar` at `top: i * slotH + pageH`, height `gapH`;
   append to overlay *(no trailing gap after last page)*

---

## 9. Measurement & Coordinate System

### Unit Conversion (`_parseToPx`)

CSS lengths are converted to CSS pixels at screen resolution (96 DPI):

| Unit | Conversion |
|------|-----------|
| `in` | × 96 |
| `cm` | × 37.795 |
| `mm` | × 3.7795 |
| `px` | × 1 |
| `rem` | × computed root font size |
| `em`  | × computed element font size |

### Template Height Measurement (`_getTemplateHeight`)

1. If `height` attribute is present: parse via `_parseToPx` and return immediately
2. Otherwise: clone the template into a `position:fixed; top:-9999px; visibility:hidden; width:pageW`
   container; append to `body`; read `offsetHeight`; remove container; return value

The offscreen container approach bypasses the `display:none` rule applied to template
elements in their original position.

### Flow Mode Coordinate System

In flow mode, the content coordinate space and the visual coordinate space are **1:1**.
There are no transforms or scaling between them. `flowY = visualY` always.

The flow is structured as a series of **slots** of height `slotH = pageH + gapH`:

```
Slot 0:
  [0, headerH)              → header zone (masked by overlay header)
  [headerH, pageH-footerH)  → content zone (visible to reader)
  [pageH-footerH, pageH)    → footer zone (masked by overlay footer)
  [pageH, slotH)            → gap zone (masked by overlay gap bar)

Slot N:
  [N*slotH, N*slotH+headerH)              → header zone
  [N*slotH+headerH, N*slotH+pageH-footerH) → content zone
  [N*slotH+pageH-footerH, N*slotH+pageH)  → footer zone
  [N*slotH+pageH, (N+1)*slotH)            → gap zone (absent on last page)
```

`<page-break>` elements are always in the content zone of their page. Their computed
height bridges the current position all the way to `nextContentStart` (the start of the
next slot's content zone), which equals `(N+1)*slotH + headerH`.

### Why Sequential Page-Break Processing Is Required

`getBoundingClientRect()` is called individually on each `<page-break>` and NOT batched
into a single read pass. This is intentional: setting the height of page-break N shifts
the DOM, changing the `offsetTop` of page-break N+1. Reading them in sequence (set →
read → set → read) gives accurate positions. Reading all positions first then setting all
heights would produce incorrect results for documents with multiple page-breaks.

---

## 10. Print Support

Print support must work identically across all three modes. The approach differs between
explicit mode (already print-accurate by default) and flow modes (require a transformation).

### Explicit Mode Print

Works natively. Injected CSS:

```css
@media print {
  body { background: white; }
  book-page {
    page-break-after: always;
    break-after: page;
    box-shadow: none;
    margin: 0;
  }
  .ebook-overlay-layer { display: none; } /* not used in explicit mode anyway */
  page-break { display: none; }
}
```

Headers and footers are part of the `book-page` DOM, so they print with the content
on each page. No pre-processing needed.

### Flow Mode Print — `beforeprint` Conversion

Flow modes require a DOM transformation before printing because the browser's print
engine does not know about the library's page structure.

#### Lifecycle

```
window.beforeprint fires
  → _prepareForPrint() runs synchronously
  → DOM is transformed to an explicit-pages structure
  → Browser renders the print preview from the transformed DOM

window.afterprint fires
  → _restoreAfterPrint() runs
  → Original flow DOM is restored
```

#### `_prepareForPrint()` Steps

1. Store the current state of `.ebook-flow-content` (save outerHTML or keep reference)
2. Hide `.ebook-overlay-layer` (`display:none`)
3. Measure page boundaries in the content flow:
   - For pure flow: boundaries are at `N * slotH` in the content coordinate space
   - For flow-with-breaks: boundaries are known from the `<page-break>` positions
4. Walk the content flow DOM, splitting at each page boundary:
   - Collect block-level elements that fall within each page's content zone
   - Create a `<book-page>` for each page range
   - Inject header/footer clones into each `<book-page>`
5. Replace `.ebook-flow-content` with the generated `<book-page>` elements
6. Apply `page-break-after: always` and appropriate `@page` rules via an injected
   `<style id="ebook-print-styles">` element

#### `_restoreAfterPrint()` Steps

1. Remove the generated `<book-page>` elements
2. Remove the `<style id="ebook-print-styles">` element
3. Restore `.ebook-flow-content`
4. Restore `.ebook-overlay-layer` to its previous visibility

#### Content Splitting Approach

Content is split at block element boundaries (paragraphs, headings, list items,
divs, etc.). The algorithm:

1. Walk direct children of `.ebook-flow-content` in order
2. For each child, measure its `offsetTop + offsetHeight` relative to the flow wrapper
3. If the child's bottom edge exceeds the current page's content zone end:
   - If the child itself is smaller than a full content zone: start a new page and
     add the child to it
   - If the child is larger than a full content zone (e.g. a tall image): place it
     on its own page (may overflow, accept the limitation)
4. Assign each group to a `<book-page>` element

Known limitation: content that straddles a page boundary at the word or line level
(mid-paragraph) will be moved entirely to the next page rather than split at the
exact character. This can leave visible whitespace at the bottom of some pages.
Authors who need word-level splitting should use explicit mode.

#### `@page` Rule Injection

```css
@page {
  size: [pageW] [pageH];
  margin: 0;
}
```

This must exactly match `<e-book>`'s `page-width` and `page-height` attributes to
ensure print dimensions match the browser preview.

---

## 11. Public Methods & Events

### `refresh()`

Re-runs the full build sequence on an already-built `<e-book>` element. Useful after:
- Dynamic content changes (appended children, text updates)
- Images or fonts that loaded after the initial build
- Programmatic resizing of the container

Behavior:
1. Tear down any existing overlay layer (`remove()` the `.ebook-overlay-layer`)
2. If flow mode: tear down `.ebook-flow-content`, restore original children to `<e-book>`
3. Re-read templates (locate new `<book-header>` / `<book-footer>` if they were re-added)
4. Run `_build()` from scratch

Note: in explicit mode, `refresh()` must also unwrap the `.book-page-content` divs and
remove any previously cloned headers/footers before rebuilding.

### Events

`ebook:ready` fires on `<e-book>` after each successful build (including after `refresh()`).
The event bubbles.

```js
detail: {
  pageCount: number,               // Total pages rendered
  mode: "explicit"                 // book-page children found
      | "flow-breaks"              // page-break elements found, no book-page
      | "flow"                     // pure flow
}
```

---

## 12. Known Limitations

### Pure flow: mid-paragraph page masking

In pure flow mode, content that falls in the header zone, footer zone, or gap zone of
any page is visually hidden by the overlay but still exists in the DOM. Users who
text-select across a page boundary may inadvertently select text from masked zones.
This is an inherent property of the overlay approach.

### Pure flow: gap zone content not recoverable

In pure flow mode (no `<page-break>` elements), the author has no way to ensure
meaningful content avoids the gap zone. For pure flow documents, authors should be
aware that approximately `headerH + footerH + gapH` worth of content is masked per
page boundary. For documents where this is unacceptable, use flow-with-breaks mode
and add `<page-break>` elements to control pagination.

### Print: mid-paragraph splitting

The `beforeprint` content splitting algorithm works at block element granularity.
Paragraphs that are taller than the remaining content area on a page will be moved
to the next page, potentially leaving blank space. Authors who need pixel-accurate
print output should use explicit mode.

### Dynamic content after build

Content added to the page after `ebook:ready` does not automatically re-paginate.
Call `refresh()` after any meaningful DOM change.

### Font and image load timing

The build waits for `document.fonts.ready` and decodes all images before measuring.
However, if a font is loaded via CSS later than `DOMContentLoaded` (e.g. lazy-loaded
icon fonts, `@import` in an external stylesheet), height measurements may be stale.
Authors should ensure all fonts used in the document are loaded before the `<e-book>`
element connects, or call `refresh()` after fonts confirm loaded.

### Landscape page inserts in flow mode

Per-page size overrides (`page-width`, `page-height` on `<book-page>`) are only
supported in explicit mode. Flow mode assumes uniform page dimensions throughout.

---

## 13. Future Work

### High Priority

- **Multi-column flow (`<e-book columns="2">`)** — Content flows across two columns
  per page before advancing. Requires column-aware `<page-break>` height calculation
  and a two-column overlay frame structure.

- **`<e-book theme="a4">` presets** — Named shortcuts for common paper sizes
  (A4, Letter, Legal, Half-Letter, Tabloid) rather than requiring explicit dimensions.

- **`ebook:page-overflow` event** — In explicit mode, fire when a `<book-page>`'s
  content overflows its bounds so authors can detect layout problems programmatically.

### Medium Priority

- **Paged.js integration** — Detect Paged.js on the page and, if present, defer print
  pagination to Paged.js rather than using the `beforeprint` block-splitting approach.
  Paged.js handles mid-paragraph splitting correctly and supports CSS `@page` running
  elements, which would give pixel-accurate print output for flow modes.

- **ResizeObserver auto-refresh** — Watch the `<e-book>` container for size changes
  (e.g. when embedded in a resizable panel) and call `refresh()` automatically.

- **`<section-break>` alias** — A semantic alias for `<page-break>` for authors who
  prefer content-semantic naming over layout-semantic naming.

### Lower Priority

- **Per-page header content in flow mode** — Allow the header to display different
  content per page (e.g. chapter title). Would require a mechanism to associate a
  section title with a flow position, then inject the correct value when building the
  overlay for that page's frame.

- **Print-safe word-level splitting** — Replace the block-level `beforeprint` splitting
  algorithm with a character-level approach using a binary search + `Range` API to find
  the exact DOM offset where content overflows each page boundary. High implementation
  complexity; Paged.js integration is the preferred path.
