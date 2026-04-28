![](stapler-header.png)

# Stapler

Zero-dependency web components for print-accurate multi-page documents in the browser.
Drop in one script tag. Write pages with HTML. Print to PDF.

Designed for documents where you know what's on each page — solution briefs, pitch decks,
reports, one-pagers, posters, certificates, invoices.

**Stapler is not for long-form paginated prose.** If you're typesetting a book, a dissertation,
or a document where content length is unknown at authoring time, use Google Docs, Word,
Pandoc, or LaTeX. Stapler is for documents where the author controls what goes on each page.

---

## Installation

The easiest option is the CDN — no download required:

```html
<script src="https://cdn.jsdelivr.net/gh/rlnorthcutt/stapler@main/dist/stapler.min.js"></script>
```

Or download `dist/stapler.min.js` and reference it locally:

```html
<script src="stapler.min.js"></script>
```

Both are self-registering. All custom elements are available immediately after the script runs.

---

## Quick start

```html
<stapled-doc page-width="8.5in" page-height="11in" page-gap="2rem">

  <page-header height="40px" skip-first>
    <div class="header">My Document · <page-number format="n of total"></page-number></div>
  </page-header>

  <page-footer height="24px">
    <div class="footer">© Acme Corp</div>
  </page-footer>

  <s-page skip-header skip-footer>
    <!-- Cover page — no header or footer -->
    <s-page-body style="padding: 3rem;">
      <h1>My Document</h1>
    </s-page-body>
  </s-page>

  <s-page>
    <!-- Page 2 — header and footer stamped automatically -->
    <s-page-body style="padding: 2rem;">
      <p>Content here.</p>
    </s-page-body>
  </s-page>

</stapled-doc>
```

Each `<s-page>` is a fixed-size, hard-clipped container sized from `page-width` × `page-height`.
Content that overflows is hidden — that's by design. Authors are responsible for fitting content.

---

## Component reference

### `<stapled-doc>`

| Attribute    | Type            | Default  | Description |
|--------------|-----------------|----------|-------------|
| `page-width` | CSS length      | **required** | Page width |
| `page-height`| CSS length      | **required** | Page height |
| `page-gap`   | CSS length      | `2rem`   | Gap between pages on screen |
| `preview`    | `"print"`       | —        | Preview mode — removes gap and shadows |

---

### `<page-header>` and `<page-footer>`

Defined **once** as direct children of `<stapled-doc>`. The library clones them into every
page automatically, then removes the originals from the DOM. Style them with your own CSS.

| Attribute    | Type       | Default | Description |
|--------------|------------|---------|-------------|
| `height`     | CSS length | **required** | Height of the header/footer |
| `skip-first` | boolean    | false   | Suppress on page 1 |
| `skip-pages` | `"1,3,5"` | —       | Comma-separated 1-indexed page numbers to suppress |

---

### `<s-page>`

A hard-clipped page container. Width and height are set from `<stapled-doc>` attributes.
Renders as a flex column: header → body → footer.

| Attribute     | Type       | Default                | Description |
|---------------|------------|------------------------|-------------|
| `skip-header` | boolean    | false                  | Suppress header on this page |
| `skip-footer` | boolean    | false                  | Suppress footer on this page |
| `page-width`  | CSS length | from `<stapled-doc>` | Per-page override (e.g. landscape insert) |
| `page-height` | CSS length | from `<stapled-doc>` | Per-page override |

---

### `<s-page-body>`

The body slot inside `<s-page>`. Takes all remaining space between header and footer.
Style it with `padding`, `max-width`, `overflow`, etc.

```html
<s-page>
  <s-page-body style="padding: 2rem 2.5rem;">
    <p>Your content here.</p>
  </s-page-body>
</s-page>
```

If you omit `<s-page-body>`, Stapler wraps your content automatically. The auto-wrapper
has no padding — add a `<s-page-body>` explicitly when you need it.

---

### Per-page header/footer override

An `<s-page>` can contain its own `<page-header>` or `<page-footer>` as a direct child.
When present it overrides the document-level template for that page only:

```html
<s-page>
  <page-header height="40px">
    <div class="cover-header">Special Cover Header</div>
  </page-header>
  <s-page-body style="padding: 2rem;">
    <!-- page content -->
  </s-page-body>
</s-page>
```

The document-level `skip-first` / `skip-pages` attributes still work for pages without overrides.

---

### `<page-number>`

Inline placeholder for use inside `<page-header>` or `<page-footer>` templates.

| `format` value | Output example |
|----------------|---------------|
| `n` *(default)*| `3` |
| `n/total`      | `3 / 8` |
| `n of total`   | `3 of 8` |
| `total`        | `8` |

---

### `preview="print"` attribute

When set, renders the on-screen view to match the printed PDF: no page gap, no shadows,
white background. Use during layout iteration to avoid repeated print previews.

```html
<stapled-doc page-width="8.5in" page-height="11in" preview="print">
  ...
</stapled-doc>
```

---

## CSS custom properties

| Property             | Default                        | Description |
|----------------------|--------------------------------|-------------|
| `--sp-page-gap`      | set from `page-gap` attribute  | Gap between pages |
| `--sp-frame-shadow`  | `0 4px 20px rgba(0,0,0,.12)`  | Shadow on page frames |

---

## Styling headers and footers

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

For programmatic PDF generation:

```bash
chrome --headless --print-to-pdf=output.pdf --no-margins your-document.html
```

> Stapler automatically injects the `@page { size: …; margin: 0; }` rule. No manual `@page` rule needed.

---

## Public API

### `refresh()`

Re-runs the full build sequence. Call after any meaningful DOM change.

```js
document.querySelector('stapled-doc').refresh()
```

### `sp:ready` event

Fired on `<stapled-doc>` after each build. Bubbles.

```js
document.querySelector('stapled-doc').addEventListener('sp:ready', (e) => {
  console.log(e.detail)
  // { pageCount: 3, pageWidth: 816, pageHeight: 1056 }
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
npm run build        # → dist/stapler.js + dist/stapler.min.js
npm run dev          # watch mode
npm run test         # run all tests
npm run typecheck    # type-check without compiling
```

Source is TypeScript in `src/`. Entry point is `src/stapler.ts`. Output is a single
IIFE with no exports and no runtime dependencies.

---

## Migration from 0.x

### Breaking changes in v0.5.0

- **`mode` attribute removed.** There is only one mode (explicit). Remove `mode="explicit"` from your markup. If you were using `mode="flow"`, see below.
- **`page-width` and `page-height` are now required.** Previously they had defaults.
- **`<page-spacer>` element removed.**
- **`<s-page-body>` added.** The body slot for page content. Auto-created if you omit it.
- **`sp:ready` event `detail.mode` removed.** Only `pageCount`, `pageWidth`, `pageHeight`.

### Migrating from explicit mode (simple)

Remove `mode="explicit"` from your `<stapled-doc>` tag. Optionally add `<s-page-body>` wrappers for padding control:

```html
<!-- before -->
<stapled-doc mode="explicit" page-width="8.5in" page-height="11in">
  <s-page>
    <div style="padding: 2rem;">Content</div>
  </s-page>
</stapled-doc>

<!-- after -->
<stapled-doc page-width="8.5in" page-height="11in">
  <s-page>
    <s-page-body style="padding: 2rem;">Content</s-page-body>
  </s-page>
</stapled-doc>
```

### Migrating from flow mode

Flow mode has been removed. You have two options:

1. **Convert to explicit mode:** Wrap each logical page's content in an `<s-page>`. This works well for documents where you know the content of each page.

2. **Pin to v0.4.x:** If you need flow mode for long-form content, keep the v0.4 build. For new documents of that type, use Google Docs, Word, Pandoc, or LaTeX — tools built for paginated prose.

---

## Known limitations

**Content that overflows a page is clipped.** Stapler sets `overflow: hidden` on `<s-page>`.
Authors are responsible for content fitting within `page-height − header-height − footer-height`.
This is intentional — Stapler is for documents where the author controls what's on each page.

---

## License

MIT
