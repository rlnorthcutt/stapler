/**
 * <page-number>
 *
 * Inline placeholder used inside <page-header> or <page-footer> templates.
 * When StapledPages stamps a clone, it resolves each <page-number> to its text value.
 *
 * Outside a <stapled-pages> context, renders "?" as a safe fallback.
 *
 * Attributes:
 *   format   "n"        → "3"        (default)
 *            "n/total"  → "3 / 8"
 *            "n of total" → "3 of 8"
 *            "total"    → "8"
 */
export class PageNumber extends HTMLElement {
  static readonly TAG = 'page-number'

  connectedCallback(): void {
    // Outside a stapled-doc context: show a fallback so authors see the placeholder
    if (!this._insideStapledDoc()) {
      this.textContent = '?'
    }
  }

  /**
   * closest('stapled-doc') doesn't cross the shadow boundary used by embed mode,
   * so a <page-number> reparented into <stapled-doc>'s shadow root would otherwise
   * look "orphaned" and get overwritten with the fallback after resolve() already ran.
   */
  private _insideStapledDoc(): boolean {
    if (this.closest('stapled-doc')) return true
    const root = this.getRootNode()
    return root instanceof ShadowRoot && root.host.tagName === 'STAPLED-DOC'
  }

  /**
   * Resolve this element's text content for a specific page.
   * Called by StapledPages when stamping header/footer clones.
   */
  resolve(pageNumber: number, totalPages: number): void {
    const format = this.getAttribute('format') ?? 'n'
    switch (format) {
      case 'n':
        this.textContent = String(pageNumber)
        break
      case 'n/total':
        this.textContent = `${pageNumber} / ${totalPages}`
        break
      case 'n of total':
        this.textContent = `${pageNumber} of ${totalPages}`
        break
      case 'total':
        this.textContent = String(totalPages)
        break
      default:
        this.textContent = String(pageNumber)
    }
  }
}
