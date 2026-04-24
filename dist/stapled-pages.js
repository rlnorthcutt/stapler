"use strict";
(() => {
  // src/css.ts
  var CORE_CSS = `
/* \u2500\u2500 Host \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
stapled-pages {
  display: block;
  position: relative;
}

/* \u2500\u2500 Explicit mode: page container \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 Flow mode: content wrapper \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 Flow mode: frame layer (headers/footers overlay) \u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 Page break indicator (flow mode) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
page-break {
  display: block;
  overflow: hidden;
  border-top: 1.5px dashed rgba(0, 0, 0, .18);
  box-sizing: border-box;
}

/* \u2500\u2500 Page number placeholder \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
page-number {
  display: inline;
}

/* \u2500\u2500 Print \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

  /* Frame layer not needed in print \u2014 headers/footers are in the content */
  .sp-frame-layer {
    display: none !important;
  }

  /* Page break authoring aid border not needed in print */
  page-break {
    border-top: none;
  }
}
`;

  // src/utils/parseToPx.ts
  function parseToPx(value, element) {
    const trimmed = value.trim();
    const match = /^(-?[\d.]+)\s*([a-z%]*)$/.exec(trimmed);
    if (!match) {
      throw new Error(`stapled-pages: cannot parse CSS length "${value}"`);
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
        throw new Error(`stapled-pages: unsupported CSS unit "${unit}" in "${value}"`);
    }
  }

  // src/utils/measureHeight.ts
  function measureHeight(template, pageWidth) {
    const heightAttr = template.getAttribute("height");
    if (heightAttr !== null) {
      return parseToPx(heightAttr, template);
    }
    const container = document.createElement("div");
    container.style.cssText = [
      "position:fixed",
      "top:-9999px",
      "left:-9999px",
      "visibility:hidden",
      `width:${pageWidth}px`,
      "pointer-events:none"
    ].join(";");
    const clone = template.cloneNode(true);
    clone.removeAttribute("height");
    clone.removeAttribute("skip-first");
    clone.removeAttribute("skip-pages");
    container.appendChild(clone);
    document.body.appendChild(container);
    const height = container.firstElementChild.offsetHeight;
    document.body.removeChild(container);
    return height;
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
  var StapledPages = class extends HTMLElement {
    constructor() {
      super(...arguments);
      // Stored template references for use during refresh()
      this._headerTemplate = null;
      this._footerTemplate = null;
      this._built = false;
      this._mode = null;
    }
    static {
      this.TAG = "stapled-pages";
    }
    connectedCallback() {
      waitForAssets(this).then(() => {
        requestAnimationFrame(() => this._build());
      });
    }
    // ─── Public API ──────────────────────────────────────────────────────────
    /**
     * Re-runs the full build sequence. Call after any meaningful DOM change.
     */
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
      return parseToPx(this.getAttribute("page-gap") ?? "2rem", this);
    }
    _detectMode() {
      const attr = this.getAttribute("mode");
      if (attr === "explicit") return "explicit";
      if (attr === "flow") {
        const hasBreaks2 = this.querySelector("page-break") !== null;
        return hasBreaks2 ? "flow-breaks" : "flow";
      }
      if (this._directChildren("s-page").length > 0) return "explicit";
      const hasBreaks = this.querySelector("page-break") !== null;
      return hasBreaks ? "flow-breaks" : "flow";
    }
    /** Returns direct children matching a tag name. Avoids :scope > selector. */
    _directChildren(tag) {
      return Array.from(this.children).filter(
        (el) => el.tagName.toLowerCase() === tag
      );
    }
    // ─── Build ───────────────────────────────────────────────────────────────
    _build() {
      this._mode = this._detectMode();
      const pageW = this._pageWidth();
      const pageH = this._pageHeight();
      const gapH = this._pageGap();
      this.style.setProperty("--sp-page-gap", `${gapH}px`);
      this._headerTemplate = this._directChildren("page-header")[0] ?? null;
      this._footerTemplate = this._directChildren("page-footer")[0] ?? null;
      const headerH = this._headerTemplate ? measureHeight(this._headerTemplate, pageW) : 0;
      const footerH = this._footerTemplate ? measureHeight(this._footerTemplate, pageW) : 0;
      if (this._mode === "explicit") {
        this._buildExplicit(pageW, pageH, headerH, footerH);
      } else {
        this._buildFlow(pageW, pageH, gapH, headerH, footerH);
      }
      this._built = true;
    }
    // ─── Explicit mode ───────────────────────────────────────────────────────
    _buildExplicit(pageW, pageH, headerH, footerH) {
      const pages = Array.from(
        this._directChildren("s-page")
      );
      const totalPages = pages.length;
      pages.forEach((page, index) => {
        const pageNumber = index + 1;
        const w = page.pageWidthAttr ? parseToPx(page.pageWidthAttr, page) : pageW;
        const h = page.pageHeightAttr ? parseToPx(page.pageHeightAttr, page) : pageH;
        page.style.width = `${w}px`;
        page.style.height = `${h}px`;
        const content = document.createElement("div");
        content.className = "sp-page-content";
        while (page.firstChild) {
          content.appendChild(page.firstChild);
        }
        page.appendChild(content);
        if (this._headerTemplate && !page.skipHeader) {
          const visibleOnPage = this._headerTemplate.isVisibleOnPage(pageNumber);
          if (visibleOnPage) {
            const clone = this._cloneTemplate(
              this._headerTemplate,
              pageNumber,
              totalPages,
              headerH
            );
            page.prepend(clone);
          }
        }
        if (this._footerTemplate && !page.skipFooter) {
          const visibleOnPage = this._footerTemplate.isVisibleOnPage(pageNumber);
          if (visibleOnPage) {
            const clone = this._cloneTemplate(
              this._footerTemplate,
              pageNumber,
              totalPages,
              footerH
            );
            page.appendChild(clone);
          }
        }
      });
      this._headerTemplate?.remove();
      this._footerTemplate?.remove();
      this._dispatchReady("explicit", totalPages, pageW, pageH);
    }
    // ─── Flow mode ───────────────────────────────────────────────────────────
    _buildFlow(pageW, pageH, gapH, headerH, footerH) {
      const slotH = pageH + gapH;
      this._headerTemplate?.remove();
      this._footerTemplate?.remove();
      const wrapper = document.createElement("div");
      wrapper.className = "sp-flow-wrapper";
      while (this.firstChild) {
        wrapper.appendChild(this.firstChild);
      }
      this.appendChild(wrapper);
      this.style.width = `${pageW}px`;
      this.style.margin = "auto";
      this.style.position = "relative";
      wrapper.style.paddingTop = `${headerH}px`;
      const isFlowBreaks = this._mode === "flow-breaks";
      if (isFlowBreaks) {
        this._processPageBreaks(wrapper, slotH, pageH, headerH, footerH);
      }
      requestAnimationFrame(() => {
        this._finaliseFlow(wrapper, pageW, pageH, gapH, slotH, headerH, footerH, isFlowBreaks);
      });
    }
    _finaliseFlow(wrapper, pageW, pageH, gapH, slotH, headerH, footerH, isFlowBreaks) {
      if (!isFlowBreaks) {
        this._injectPageSpacers(wrapper, slotH, headerH, footerH, gapH);
      }
      const rawH = wrapper.offsetHeight;
      let numPages = Math.ceil(rawH / slotH);
      if (numPages < 1) numPages = 1;
      const padBottom = numPages * slotH - gapH - wrapper.offsetHeight;
      if (padBottom > 0) {
        wrapper.style.paddingBottom = `${padBottom}px`;
      }
      this.style.height = `${numPages * slotH - gapH}px`;
      this._buildFrameLayer(numPages, slotH, pageH, headerH, footerH);
      const mode = isFlowBreaks ? "flow-breaks" : "flow";
      this._dispatchReady(mode, numPages, pageW, pageH);
    }
    /**
     * Process <page-break> elements sequentially (not batched).
     * Each element's height is set to bridge its current position to the
     * start of the next page's content area.
     *
     * IMPORTANT: Must remain sequential (set → read → set).
     * See SPEC.md §9 and CLAUDE.md for why batching is wrong here.
     */
    _processPageBreaks(wrapper, slotH, pageH, headerH, footerH) {
      const breaks = Array.from(wrapper.querySelectorAll("page-break"));
      const wrapperTop = wrapper.getBoundingClientRect().top;
      for (const pb of breaks) {
        pb.style.height = "0";
        const pbTop = pb.getBoundingClientRect().top;
        const flowY = pbTop - wrapperTop;
        const pageIndex = Math.floor(flowY / slotH);
        const nextContentStart = (pageIndex + 1) * slotH + headerH;
        const height = nextContentStart - flowY;
        pb.style.height = `${Math.max(0, height)}px`;
      }
    }
    /**
     * Inject invisible spacer divs at each page boundary so content physically
     * avoids the header/footer/gap zones. No content is ever masked.
     */
    _injectPageSpacers(wrapper, slotH, headerH, footerH, gapH) {
      const children = Array.from(wrapper.children);
      const wrapperTop = wrapper.getBoundingClientRect().top;
      let nextBoundaryPage = 1;
      for (const child of children) {
        const rect = child.getBoundingClientRect();
        let childTop = rect.top - wrapperTop;
        const childHeight = rect.height;
        const contentZoneEnd = nextBoundaryPage * slotH - footerH - gapH;
        if (childTop + childHeight > contentZoneEnd) {
          const nextContentStart = nextBoundaryPage * slotH + headerH;
          const spacerH = nextContentStart - childTop;
          if (spacerH > 0) {
            const spacer = document.createElement("div");
            spacer.className = "sp-page-spacer";
            spacer.style.height = `${spacerH}px`;
            wrapper.insertBefore(spacer, child);
            childTop = nextContentStart;
          }
          nextBoundaryPage++;
        }
        while (childTop + childHeight > nextBoundaryPage * slotH - footerH - gapH) {
          nextBoundaryPage++;
        }
      }
    }
    /**
     * Build the absolutely-positioned frame layer with per-page header/footer clones.
     */
    _buildFrameLayer(numPages, slotH, pageH, headerH, footerH) {
      const layer = document.createElement("div");
      layer.className = "sp-frame-layer";
      for (let i = 0; i < numPages; i++) {
        const pageNumber = i + 1;
        const frame = document.createElement("div");
        frame.className = "sp-page-frame";
        frame.style.top = `${i * slotH}px`;
        frame.style.height = `${pageH}px`;
        if (this._headerTemplate) {
          const visible = this._headerTemplate.isVisibleOnPage(pageNumber);
          if (visible) {
            const wrapper = document.createElement("div");
            wrapper.className = "sp-frame-header";
            wrapper.style.height = `${headerH}px`;
            wrapper.appendChild(
              this._cloneTemplate(this._headerTemplate, pageNumber, numPages, headerH)
            );
            frame.appendChild(wrapper);
          }
        }
        if (this._footerTemplate) {
          const visible = this._footerTemplate.isVisibleOnPage(pageNumber);
          if (visible) {
            const wrapper = document.createElement("div");
            wrapper.className = "sp-frame-footer";
            wrapper.style.height = `${footerH}px`;
            wrapper.appendChild(
              this._cloneTemplate(this._footerTemplate, pageNumber, numPages, footerH)
            );
            frame.appendChild(wrapper);
          }
        }
        layer.appendChild(frame);
      }
      this.appendChild(layer);
    }
    // ─── Template cloning ────────────────────────────────────────────────────
    /**
     * Clone a template element, strip control attributes, set height,
     * and resolve all <page-number> placeholders.
     */
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
      if (this._mode === "explicit") {
        this._teardownExplicit();
      } else {
        this._teardownFlow();
      }
      this._built = false;
      this._mode = null;
    }
    _teardownExplicit() {
      if (this._headerTemplate) this.prepend(this._headerTemplate);
      if (this._footerTemplate) {
        const ref = this._headerTemplate ? this._headerTemplate.nextSibling : this.firstChild;
        this.insertBefore(this._footerTemplate, ref);
      }
      const pages = this._directChildren("s-page");
      for (const page of pages) {
        Array.from(page.children).forEach((child) => {
          if (child.tagName.toLowerCase() === "page-header" || child.tagName.toLowerCase() === "page-footer") {
            child.remove();
          }
        });
        const contentDiv = Array.from(page.children).find(
          (el) => el.classList.contains("sp-page-content")
        );
        if (contentDiv) {
          while (contentDiv.firstChild) {
            page.insertBefore(contentDiv.firstChild, contentDiv);
          }
          contentDiv.remove();
        }
        page.style.width = "";
        page.style.height = "";
      }
    }
    _teardownFlow() {
      this.querySelector(".sp-frame-layer")?.remove();
      const wrapper = this.querySelector(".sp-flow-wrapper");
      if (wrapper) {
        if (this._headerTemplate) wrapper.prepend(this._headerTemplate);
        if (this._footerTemplate) wrapper.appendChild(this._footerTemplate);
        wrapper.querySelectorAll(".sp-page-spacer").forEach((s) => s.remove());
        wrapper.querySelectorAll("page-break").forEach((pb) => {
          pb.style.height = "";
        });
        while (wrapper.firstChild) {
          this.insertBefore(wrapper.firstChild, wrapper);
        }
        wrapper.remove();
      }
      this.style.width = "";
      this.style.height = "";
      this.style.margin = "";
      this.style.position = "";
    }
    // ─── Events ──────────────────────────────────────────────────────────────
    _dispatchReady(mode, pageCount, pageWidth, pageHeight) {
      const detail = { pageCount, mode, pageWidth, pageHeight };
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

  // src/components/PageBreak.ts
  var PageBreak = class extends HTMLElement {
    static {
      this.TAG = "page-break";
    }
  };

  // src/components/PageNumber.ts
  var PageNumber = class extends HTMLElement {
    static {
      this.TAG = "page-number";
    }
    connectedCallback() {
      if (!this.closest("stapled-pages")) {
        this.textContent = "?";
      }
    }
    /**
     * Resolve this element's text content for a specific page.
     * Called by EBook when stamping header/footer clones.
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

  // src/stapled-pages.ts
  if (!document.getElementById("sp-core-styles")) {
    const style = document.createElement("style");
    style.id = "sp-core-styles";
    style.textContent = CORE_CSS;
    document.head.appendChild(style);
  }
  customElements.define(StapledPages.TAG, StapledPages);
  customElements.define(PageHeader.TAG, PageHeader);
  customElements.define(PageFooter.TAG, PageFooter);
  customElements.define(SPage.TAG, SPage);
  customElements.define(PageBreak.TAG, PageBreak);
  customElements.define(PageNumber.TAG, PageNumber);
})();
