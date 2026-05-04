"use strict";
(() => {
  // src/css.ts
  var CORE_CSS = `
/* \u2500\u2500 Host \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
stapled-doc {
  display: block;
  position: relative;
}

/* \u2500\u2500 Page container \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
s-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  margin: var(--sp-page-gap, 2rem) auto;
  box-shadow: var(--sp-frame-shadow, 0 4px 20px rgba(0,0,0,.12));
}

/* Header / footer inside s-page */
s-page > page-header,
s-page > page-footer {
  display: block;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

/* Body slot \u2014 takes all remaining space */
s-page-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

/* Hide template elements (direct children of stapled-doc) until JS processes them */
stapled-doc > page-header,
stapled-doc > page-footer {
  display: none;
}

/* \u2500\u2500 Page number placeholder \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
page-number {
  display: inline;
}

/* \u2500\u2500 Preview print mode \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
stapled-doc[preview="print"] {
  background: white;
}

stapled-doc[preview="print"] s-page {
  --sp-frame-shadow: none;
}

/* \u2500\u2500 Print \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@media print {
  body {
    background: white !important;
  }

  s-page {
    page-break-after: always;
    break-after: page;
    box-shadow: none !important;
    margin: 0 !important;
  }

  stapled-doc {
    height: auto !important;
  }
}
`;

  // src/utils/parseToPx.ts
  function parseToPx(value, element) {
    const trimmed = value.trim();
    const match = /^(-?[\d.]+)\s*([a-z%]*)$/.exec(trimmed);
    if (!match) {
      throw new Error(`Staple Jam: cannot parse CSS length "${value}"`);
    }
    const num = parseFloat(match[1] ?? "0");
    const unit = match[2] ?? "px";
    switch (unit) {
      case "px":
        return num;
      case "in":
        return num * 96;
      case "cm":
        return num * 37.7952756;
      case "mm":
        return num * 3.77952756;
      case "pt":
        return num * (96 / 72);
      case "rem": {
        const rootFontSize = parseFloat(
          getComputedStyle(document.documentElement).fontSize
        );
        return num * rootFontSize;
      }
      case "em": {
        const el = element ?? document.documentElement;
        const fontSize = parseFloat(getComputedStyle(el).fontSize);
        return num * fontSize;
      }
      default:
        throw new Error(`Staple Jam: unsupported CSS unit "${unit}" in "${value}"`);
    }
  }

  // src/utils/measureHeight.ts
  function measureHeight(template) {
    const heightAttr = template.getAttribute("height");
    if (heightAttr === null) return 0;
    return parseToPx(heightAttr, template);
  }

  // src/utils/waitForAssets.ts
  function waitForAssets(root) {
    const domReady = new Promise((resolve) => {
      if (document.readyState !== "loading") {
        resolve();
      } else {
        document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
      }
    });
    const fontsReady = document.fonts?.ready ? document.fonts.ready.then(() => void 0) : Promise.resolve();
    const imagesReady = domReady.then(() => {
      const imgs = Array.from(root.querySelectorAll("img"));
      return Promise.all(
        imgs.map(
          (img) => img.complete ? Promise.resolve() : img.decode().catch(() => {
          })
        )
      ).then(() => void 0);
    });
    return Promise.all([domReady, fontsReady, imagesReady]).then(() => void 0);
  }

  // src/components/StapledPages.ts
  var Stapler = class extends HTMLElement {
    constructor() {
      super(...arguments);
      this._headerTemplate = null;
      this._footerTemplate = null;
      this._built = false;
      this._pageStyleEl = null;
      this._shadowInitialized = false;
    }
    static {
      this.TAG = "stapled-doc";
    }
    // When embed mode is active, all authored content lives in the shadow root.
    // This getter lets build/teardown code operate on the right container without
    // branching everywhere.
    get _contentRoot() {
      return this.shadowRoot ?? this;
    }
    connectedCallback() {
      if (this.hasAttribute("embed")) {
        this._initEmbedMode();
      }
      const assetRoot = this.shadowRoot ?? this;
      waitForAssets(assetRoot).then(() => {
        requestAnimationFrame(() => this._build());
      });
    }
    // Attaches a shadow root, injects structural CSS, injects any author-supplied
    // stylesheets (via `stylesheet` attribute or <link>/<style> children), then
    // moves all remaining light-DOM children into the shadow root so they are
    // isolated from the parent page's CSS.
    _initEmbedMode() {
      if (this._shadowInitialized) return;
      const shadow = this.attachShadow({ mode: "open" });
      const coreStyle = document.createElement("style");
      coreStyle.textContent = CORE_CSS;
      shadow.appendChild(coreStyle);
      const stylesheetAttr = this.getAttribute("stylesheet");
      if (stylesheetAttr) {
        for (const href of stylesheetAttr.split(",").map((s) => s.trim()).filter(Boolean)) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          shadow.appendChild(link);
        }
      }
      while (this.firstChild) {
        shadow.appendChild(this.firstChild);
      }
      this._shadowInitialized = true;
    }
    refresh() {
      this._teardown();
      this._build();
    }
    // ─── Attribute helpers ───────────────────────────────────────────────────
    _pageWidth() {
      return parseToPx(this.getAttribute("page-width") ?? "8.5in", this);
    }
    _pageHeight() {
      return parseToPx(this.getAttribute("page-height") ?? "11in", this);
    }
    _pageGap() {
      if (this.getAttribute("preview") === "print") return 0;
      return parseToPx(this.getAttribute("page-gap") ?? "2rem", this);
    }
    _directChildren(tag) {
      return Array.from(this._contentRoot.children).filter(
        (el) => el.tagName.toLowerCase() === tag
      );
    }
    // ─── Build ───────────────────────────────────────────────────────────────
    _build() {
      const modeAttr = this.getAttribute("mode");
      if (modeAttr === "flow") {
        console.error(
          '[stapler] mode="flow" has been removed in v0.5.0. Convert to explicit mode by wrapping your content in <s-page> elements, or pin to v0.4.x if you need flow mode.'
        );
        return;
      }
      if (!this.getAttribute("page-width")) {
        console.error('[stapler] <stapled-doc> requires a page-width attribute (e.g. page-width="8.5in").');
        return;
      }
      if (!this.getAttribute("page-height")) {
        console.error('[stapler] <stapled-doc> requires a page-height attribute (e.g. page-height="11in").');
        return;
      }
      const pageW = this._pageWidth();
      const pageH = this._pageHeight();
      const gapH = this._pageGap();
      this.style.setProperty("--sp-page-gap", `${gapH}px`);
      this._pageStyleEl?.remove();
      const pageStyle = document.createElement("style");
      pageStyle.textContent = `@page { size: ${pageW}px ${pageH}px; margin: 0; }`;
      document.head.appendChild(pageStyle);
      this._pageStyleEl = pageStyle;
      this._headerTemplate = this._directChildren("page-header")[0] ?? null;
      this._footerTemplate = this._directChildren("page-footer")[0] ?? null;
      if (this._headerTemplate && !this._headerTemplate.heightAttr) {
        console.error('[stapler] <page-header> requires a height attribute (e.g. height="48px").');
        return;
      }
      if (this._footerTemplate && !this._footerTemplate.heightAttr) {
        console.error('[stapler] <page-footer> requires a height attribute (e.g. height="32px").');
        return;
      }
      const headerH = this._headerTemplate ? measureHeight(this._headerTemplate) : 0;
      const footerH = this._footerTemplate ? measureHeight(this._footerTemplate) : 0;
      this._buildExplicit(pageW, pageH, headerH, footerH);
      this._built = true;
    }
    // ─── Explicit mode ───────────────────────────────────────────────────────
    _buildExplicit(pageW, pageH, headerH, footerH) {
      const pages = Array.from(this._directChildren("s-page"));
      const totalPages = pages.length;
      pages.forEach((page, index) => {
        const pageNumber = index + 1;
        const w = page.pageWidthAttr ? parseToPx(page.pageWidthAttr, page) : pageW;
        const h = page.pageHeightAttr ? parseToPx(page.pageHeightAttr, page) : pageH;
        page.style.width = `${w}px`;
        page.style.height = `${h}px`;
        const perPageHeader = Array.from(page.children).find(
          (c) => c.tagName.toLowerCase() === "page-header"
        );
        const perPageFooter = Array.from(page.children).find(
          (c) => c.tagName.toLowerCase() === "page-footer"
        );
        const existingBody = Array.from(page.children).find(
          (c) => c.tagName.toLowerCase() === "s-page-body"
        );
        if (existingBody) {
          if (perPageHeader) perPageHeader.remove();
          if (perPageFooter) perPageFooter.remove();
        } else {
          const body = document.createElement("s-page-body");
          body.setAttribute("data-sp-autowrap", "");
          while (page.firstChild) {
            const child = page.firstChild;
            if (child === perPageHeader || child === perPageFooter) {
              page.removeChild(child);
            } else {
              body.appendChild(child);
            }
          }
          page.appendChild(body);
        }
        if (perPageHeader) {
          const hH = perPageHeader.heightAttr ? parseToPx(perPageHeader.heightAttr, perPageHeader) : headerH;
          perPageHeader.style.height = `${hH}px`;
          perPageHeader.querySelectorAll("page-number").forEach(
            (pn) => pn.resolve(pageNumber, totalPages)
          );
          page.prepend(perPageHeader);
        } else if (this._headerTemplate && !page.skipHeader) {
          const visibleOnPage = this._headerTemplate.isVisibleOnPage(pageNumber);
          if (visibleOnPage) {
            const clone = this._cloneTemplate(this._headerTemplate, pageNumber, totalPages, headerH);
            clone.dataset.spClone = "";
            page.prepend(clone);
          }
        }
        if (perPageFooter) {
          const fH = perPageFooter.heightAttr ? parseToPx(perPageFooter.heightAttr, perPageFooter) : footerH;
          perPageFooter.style.height = `${fH}px`;
          perPageFooter.querySelectorAll("page-number").forEach(
            (pn) => pn.resolve(pageNumber, totalPages)
          );
          page.appendChild(perPageFooter);
        } else if (this._footerTemplate && !page.skipFooter) {
          const visibleOnPage = this._footerTemplate.isVisibleOnPage(pageNumber);
          if (visibleOnPage) {
            const clone = this._cloneTemplate(this._footerTemplate, pageNumber, totalPages, footerH);
            clone.dataset.spClone = "";
            page.appendChild(clone);
          }
        }
      });
      this._headerTemplate?.remove();
      this._footerTemplate?.remove();
      this._dispatchReady(totalPages, pageW, pageH);
    }
    // ─── Template cloning ────────────────────────────────────────────────────
    _cloneTemplate(template, pageNumber, totalPages, height) {
      const clone = template.cloneNode(true);
      clone.removeAttribute("height");
      clone.removeAttribute("skip-first");
      clone.removeAttribute("skip-pages");
      clone.style.height = `${height}px`;
      const pageNumbers = clone.querySelectorAll("page-number");
      pageNumbers.forEach((pn) => pn.resolve(pageNumber, totalPages));
      return clone;
    }
    // ─── Teardown ────────────────────────────────────────────────────────────
    _teardown() {
      if (!this._built) return;
      const root = this._contentRoot;
      if (this._headerTemplate) root.prepend(this._headerTemplate);
      if (this._footerTemplate) {
        const ref = this._headerTemplate ? this._headerTemplate.nextSibling : root.firstChild;
        root.insertBefore(this._footerTemplate, ref);
      }
      const pages = this._directChildren("s-page");
      for (const page of pages) {
        Array.from(page.children).forEach((child) => {
          if ((child.tagName.toLowerCase() === "page-header" || child.tagName.toLowerCase() === "page-footer") && child.hasAttribute("data-sp-clone")) {
            child.remove();
          }
        });
        const autoBody = Array.from(page.children).find(
          (el) => el.tagName.toLowerCase() === "s-page-body" && el.hasAttribute("data-sp-autowrap")
        );
        if (autoBody) {
          while (autoBody.firstChild) {
            page.insertBefore(autoBody.firstChild, autoBody);
          }
          autoBody.remove();
        }
        page.style.width = "";
        page.style.height = "";
      }
      this._pageStyleEl?.remove();
      this._pageStyleEl = null;
      this._built = false;
    }
    // ─── Events ──────────────────────────────────────────────────────────────
    _dispatchReady(pageCount, pageWidth, pageHeight) {
      const detail = { pageCount, pageWidth, pageHeight };
      this.dispatchEvent(
        new CustomEvent("sp:ready", { detail, bubbles: true })
      );
    }
  };

  // src/components/PageSlot.ts
  var PageSlot = class extends HTMLElement {
    /** CSS length string, or null if not set (will be measured). */
    get heightAttr() {
      return this.getAttribute("height");
    }
    /** True if this slot should be suppressed on page 1. */
    get skipFirst() {
      return this.hasAttribute("skip-first");
    }
    /**
     * Set of 1-indexed page numbers on which this slot should be suppressed.
     * Empty set if the attribute is absent.
     */
    get skipPages() {
      const raw = this.getAttribute("skip-pages");
      if (!raw) return /* @__PURE__ */ new Set();
      return new Set(
        raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
      );
    }
    /** Returns true if this slot should be shown on the given 1-indexed page. */
    isVisibleOnPage(pageNumber) {
      if (this.skipFirst && pageNumber === 1) return false;
      if (this.skipPages.has(pageNumber)) return false;
      return true;
    }
  };

  // src/components/PageHeader.ts
  var PageHeader = class extends PageSlot {
    static {
      this.TAG = "page-header";
    }
  };

  // src/components/PageFooter.ts
  var PageFooter = class extends PageSlot {
    static {
      this.TAG = "page-footer";
    }
  };

  // src/components/SPage.ts
  var SPage = class extends HTMLElement {
    static {
      this.TAG = "s-page";
    }
    get skipHeader() {
      return this.hasAttribute("skip-header");
    }
    get skipFooter() {
      return this.hasAttribute("skip-footer");
    }
    /** Per-page width override, or null to inherit from <stapled-pages>. */
    get pageWidthAttr() {
      return this.getAttribute("page-width");
    }
    /** Per-page height override, or null to inherit from <stapled-pages>. */
    get pageHeightAttr() {
      return this.getAttribute("page-height");
    }
  };

  // src/components/SPageBody.ts
  var SPageBody = class extends HTMLElement {
    static {
      this.TAG = "s-page-body";
    }
  };

  // src/components/PageNumber.ts
  var PageNumber = class extends HTMLElement {
    static {
      this.TAG = "page-number";
    }
    connectedCallback() {
      if (!this.closest("stapled-doc")) {
        this.textContent = "?";
      }
    }
    /**
     * Resolve this element's text content for a specific page.
     * Called by StapledPages when stamping header/footer clones.
     */
    resolve(pageNumber, totalPages) {
      const format = this.getAttribute("format") ?? "n";
      switch (format) {
        case "n":
          this.textContent = String(pageNumber);
          break;
        case "n/total":
          this.textContent = `${pageNumber} / ${totalPages}`;
          break;
        case "n of total":
          this.textContent = `${pageNumber} of ${totalPages}`;
          break;
        case "total":
          this.textContent = String(totalPages);
          break;
        default:
          this.textContent = String(pageNumber);
      }
    }
  };

  // src/stapler.ts
  if (!document.getElementById("sp-core-styles")) {
    const style = document.createElement("style");
    style.id = "sp-core-styles";
    style.textContent = CORE_CSS;
    document.head.appendChild(style);
  }
  customElements.define(Stapler.TAG, Stapler);
  customElements.define(PageHeader.TAG, PageHeader);
  customElements.define(PageFooter.TAG, PageFooter);
  customElements.define(SPage.TAG, SPage);
  customElements.define(SPageBody.TAG, SPageBody);
  customElements.define(PageNumber.TAG, PageNumber);
})();
