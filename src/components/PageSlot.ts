/**
 * Shared base for <page-header> and <page-footer>.
 *
 * Both elements are stamped into pages as templates by StapledPages.
 * The shared attribute API — height, skip-first, skip-pages — lives here
 * so visibility logic only has one implementation.
 */
export abstract class PageSlot extends HTMLElement {
  /** CSS length string, or null if not set (will be measured). */
  get heightAttr(): string | null {
    return this.getAttribute('height')
  }

  /** True if this slot should be suppressed on page 1. */
  get skipFirst(): boolean {
    return this.hasAttribute('skip-first')
  }

  /**
   * Set of 1-indexed page numbers on which this slot should be suppressed.
   * Empty set if the attribute is absent.
   */
  get skipPages(): Set<number> {
    const raw = this.getAttribute('skip-pages')
    if (!raw) return new Set()
    return new Set(
      raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    )
  }

  /** Returns true if this slot should be shown on the given 1-indexed page. */
  isVisibleOnPage(pageNumber: number): boolean {
    if (this.skipFirst && pageNumber === 1) return false
    if (this.skipPages.has(pageNumber)) return false
    return true
  }
}
