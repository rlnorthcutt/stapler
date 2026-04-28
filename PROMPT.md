# Stapler — AI Prompt

Paste the block below into any LLM conversation to generate a valid Stapler document.

---

```
You are generating an HTML document that uses the Stapler web component library for
print-accurate, multi-page documents. Follow these rules exactly.

## Script tag

Always include this in <head>:

  <script src="https://cdn.jsdelivr.net/gh/rlnorthcutt/stapler@main/dist/stapler.min.js"></script>

## Root element

  <stapled-doc page-width="8.5in" page-height="11in" page-gap="2rem">

page-width and page-height are required. Use "8.5in" × "11in" for US Letter, "210mm" × "297mm"
for A4. page-gap controls the visual space between pages on screen only; it does not print.

## Pages

Each page is an <s-page> element:

  <s-page>
    <s-page-body style="padding: 2rem;">
      <!-- your content here -->
    </s-page-body>
  </s-page>

<s-page-body> is the content area between the header and footer. Always include it and set
padding via inline style. Content that overflows the page is clipped — you are responsible
for fitting content within: page-height − header-height − footer-height.

## Headers and footers

Define them once, directly inside <stapled-doc>. They are cloned onto every page automatically.
Always set the height attribute explicitly — this avoids a measurement pass and is more reliable.

  <page-header height="40px">
    <div>My Document</div>
    <div>Page <page-number format="n of total"></page-number></div>
  </page-header>

  <page-footer height="24px">
    <div>Confidential</div>
    <div>© Acme Corp 2025</div>
  </page-footer>

Style headers and footers with your own CSS — the library adds no colors, fonts, or padding.

## Page numbers

Use <page-number> inside any header or footer. Format options:
  n            → "3"
  n/total      → "3 / 8"
  n of total   → "3 of 8"
  total        → "8"

## Suppressing headers and footers

On <page-header> or <page-footer>:
  skip-first         — suppress on page 1 (useful when page 1 is a cover)
  skip-pages="1,3"   — suppress on specific pages (1-indexed, comma-separated)

On an individual <s-page>:
  skip-header        — suppress the header on this page only
  skip-footer        — suppress the footer on this page only

## Landscape inserts

  <s-page page-width="11in" page-height="8.5in">
    <s-page-body style="padding: 2rem;">
      <!-- wide chart or table -->
    </s-page-body>
  </s-page>

## Print CSS

Add this to your stylesheet to pin the paper size when printing to PDF:

  @page {
    size: 8.5in 11in;  /* match page-width × page-height */
    margin: 0;
  }

## Full example

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Report</title>
  <script src="https://cdn.jsdelivr.net/gh/rlnorthcutt/stapler@main/dist/stapler.min.js"></script>
  <style>
    @page { size: 8.5in 11in; margin: 0; }
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
      justify-content: space-between;
      align-items: center;
      padding: 0 1.5rem;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
    }
  </style>
</head>
<body>

<stapled-doc page-width="8.5in" page-height="11in" page-gap="2rem">

  <page-header height="40px" skip-first>
    <div>My Report</div>
    <div><page-number format="n of total"></page-number></div>
  </page-header>

  <page-footer height="24px">
    <div>Confidential</div>
    <div>© Acme Corp 2025</div>
  </page-footer>

  <!-- Cover page — no header or footer -->
  <s-page skip-header skip-footer>
    <s-page-body style="padding: 3rem; display: flex; flex-direction: column; justify-content: center;">
      <h1>My Report</h1>
      <p>Prepared by Acme Corp</p>
    </s-page-body>
  </s-page>

  <!-- Page 2 onwards — header and footer stamped automatically -->
  <s-page>
    <s-page-body style="padding: 2rem 2.5rem;">
      <h2>Executive Summary</h2>
      <p>Content here.</p>
    </s-page-body>
  </s-page>

</stapled-doc>

</body>
</html>
```
