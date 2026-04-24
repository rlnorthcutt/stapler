![](stapled-pages-header.png)

# Stapled-Pages

Zero-dependency web components for print-accurate multi-page documents in the browser.
Drop in one script tag. Write pages with HTML. Print to PDF.

Designed for AI-generated documents — solution briefs, reports, pitch decks — where
predictable, explicit markup matters more than clever inference.

---

## Installation

No npm. No build step. Copy `dist/stapled-pages.js` (or `dist/stapled-pages.min.js`) into your project
and reference it:

```html
<script src="stapled-pages.js"></script>
```

Both files are self-registering. All six custom elements are available immediately after
the script runs.

---

## Three modes

### Mode 1 — Explicit pages

Each `<s-page>` is a fixed-size, hard-clipped container. You control the layout.
Content that overflows is hidden. Best for documents where you know exactly what goes on each page.

```html
<stapled-pages mode="explicit" page-width="8.5in" page-height="11in" page-gap="2rem">

  <page-header height="40px" skip-first>
    <div class="header">My Document · <page-number format="n of total"></page-number></div>
  </page-header>

  <page-footer height="24px">
    <div class="footer">© Acme Corp</div>
  </page-footer>

  <s-page skip-header skip-footer>
    <!-- Cover page — no header or footer -->
  </s-page>

  <s-page>
    <!-- Page 2 — header and footer stamped automatically -->
  </s-page>

  <s-page>
    <!-- Page 3 -->
  </s-page>

</stapled-pages>
```

### Mode 2 — Flow with page breaks

Content flows in a single column. `<page-break>` elements bridge the current position
to the next page's content area — accounting for header, footer, and gap zones.
Headers and footers are overlaid via an absolutely-positioned frame layer.

```html
<stapled-pages mode="flow" page-width="8.5in" page-height="11in" page-gap="2rem">

  <page-header height="36px">
    <div class="header">My Report · Page <page-number format="n"></page-number></div>
  </page-header>

  <page-footer height="24px">
    <div class="footer">Confidential</div>
  </page-footer>

  <h1>Executive Summary</h1>
  <p>...</p>
  <p>...</p>

  <page-break></page-break>

  <h1>Section 2</h1>
  <p>...</p>

</stapled-pages>
```

### Mode 3 — Pure flow

No `<page-break>` elements. The library measures your content, computes page boundaries,
and injects spacer elements to push content out of header/footer/gap zones automatically.
Best for long-form content where you don't control where page breaks fall.

```html
<stapled-pages mode="flow" page-width="8.5in" page-height="11in" page-gap="2rem">

  <page-header height="36px">
    <div class="header">Checklist · <page-number format="n of total"></page-number></div>
  </page-header>

  <h1>Full Checklist</h1>
  <ul>
    <li>Item one</li>
    <li>Item two</li>
    <!-- ...many items... -->
  </ul>

</stapled-pages>
```

---

## Component reference

### `<stapled-pages>`

| Attribute    | Type                    | Default  | Description |
|--------------|-------------------------|----------|-------------|
| `mode`       | `explicit` \| `flow`   | auto     | **Required for AI-generated documents.** Explicit = `<s-page>` children. Flow = freeform content. |
| `page-width` | CSS length              | `8.5in`  | Page width |
| `page-height`| CSS length              | `11in`   | Page height |
| `page-gap`   | CSS length              | `2rem`   | Gap between pages |

Auto-detection fallback (for hand-authored HTML only): `<s-page>` children → explicit;
`<page-break>` present → flow-breaks; neither → pure flow.

---

### `<page-header>` and `<page-footer>`

Defined **once** as direct children of `<stapled-pages>`. The library clones them into every
page automatically, then removes the originals from the DOM. Style them with your own CSS —
the library adds no colors, fonts, or padding to header/footer content.

| Attribute    | Type       | Default | Description |
|--------------|------------|---------|-------------|
| `height`     | CSS length | auto    | If provided, used directly. If omitted, measured via off-screen clone. Providing it is faster and more reliable. |
| `skip-first` | boolean    | false   | Suppress on page 1 |
| `skip-pages` | `"1,3,5"` | —       | Comma-separated 1-indexed page numbers to suppress |

---

### `<s-page>` *(explicit mode only)*

A hard-clipped page container. The library sets `width` and `height` from `<stapled-pages>` attributes
and wraps existing children in a flex-column layout.

| Attribute     | Type       | Default                  | Description |
|---------------|------------|--------------------------|-------------|
| `skip-header` | boolean    | false                    | Suppress header on this page |
| `skip-footer` | boolean    | false                    | Suppress footer on this page |
| `page-width`  | CSS length | from `<stapled-pages>`   | Per-page override (e.g. landscape insert) |
| `page-height` | CSS length | from `<stapled-pages>`   | Per-page override |

---

### `<page-break>` *(flow mode only)*

Forces subsequent content to start at the next page's content area. Renders a faint
dashed border as an authoring aid; hidden in print. No attributes.

---

### `<page-number>`

Inline placeholder for use inside `<page-header>` or `<page-footer>` templates.
Resolved automatically when the template is stamped. Renders `?` as a fallback
when used outside a `<stapled-pages>`.

| `format` value | Output example |
|----------------|---------------|
| `n` *(default)*| `3` |
| `n/total`      | `3 / 8` |
| `n of total`   | `3 of 8` |
| `total`        | `8` |

---

## CSS custom properties

Set these on the `<stapled-pages>` element to tune the visual chrome:

| Property             | Default                        | Description |
|----------------------|--------------------------------|-------------|
| `--sp-page-gap`      | set from `page-gap` attribute  | Gap between pages |
| `--sp-frame-shadow`  | `0 4px 20px rgba(0,0,0,.12)`  | Shadow on page frames; set to `none` to remove |

---

## Styling headers and footers

The library injects structural layout rules only. All visual styling — colors, fonts,
padding, borders — belongs in your stylesheet. Style against `page-header` and
`page-footer` directly:

```css
page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  background: #1a1a2e;
  color: white;
  font-size: 10px;
}

page-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 1.5rem;
  border-top: 1px solid #e5e7eb;
  font-size: 10px;
  color: #9ca3af;
}
```

---

## Print to PDF

Open the document in Chrome or Edge, press **Cmd/Ctrl+P**, set:
- Paper size: match your `page-width` × `page-height`
- Margins: None
- Background graphics: on

For programmatic PDF generation, use headless Chrome:

```bash
chrome --headless --print-to-pdf=output.pdf --no-margins your-document.html
```

Add this to your document's `<style>` to pin the page size:

```css
@page {
  size: 8.5in 11in;   /* match page-width × page-height on <stapled-pages> */
  margin: 0;
}
```

---

## Public API

### `refresh()`

Re-runs the full build sequence. Call after any meaningful DOM change.

```js
document.querySelector('stapled-pages').refresh()
```

### `sp:ready` event

Fired on `<stapled-pages>` after each build (including after `refresh()`). Bubbles.

```js
document.querySelector('stapled-pages').addEventListener('sp:ready', (e) => {
  console.log(e.detail)
  // { pageCount: 3, mode: 'explicit', pageWidth: 816, pageHeight: 1056 }
})
```

---

## Supported CSS units

`page-width`, `page-height`, `page-gap`, and `height` attributes all accept:
`px`, `in`, `cm`, `mm`, `pt`, `rem`, `em`.

---

## Building from source

```bash
npm install
npm run build        # → dist/stapled-pages.js + dist/stapled-pages.min.js
npm run dev          # watch mode with inline sourcemaps
npm run test         # run all tests
npm run typecheck    # type-check without compiling
```

Source is TypeScript in `src/`. Entry point is `src/stapled-pages.ts`. Output is a single
IIFE with no exports and no runtime dependencies.

---

## Known limitations

**Explicit mode: content that overflows a page is clipped.** The library sets
`overflow: hidden` on `<s-page>`. Authors are responsible for content fitting within
`page-height − header-height − footer-height`.

**Pure flow: block-level granularity only.** Spacers are injected between block-level
children. A paragraph taller than the remaining content area on a page is moved
to the next page in its entirety, leaving whitespace at the bottom.

**Font and image timing.** The build waits for `document.fonts.ready` and decodes all
`<img>` descendants before measuring. Fonts loaded via `@import` after `DOMContentLoaded`
may not be ready in time. Call `refresh()` if measurements appear wrong after late-loading fonts.

**Flow mode: uniform page dimensions only.** Per-page size overrides (`page-width`,
`page-height` on `<s-page>`) are supported in explicit mode only.

---

## License

MIT
