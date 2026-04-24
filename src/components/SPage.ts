/**
 * <s-page>  (Explicit mode only)
 *
 * A hard-clipped page container. Content that overflows is hidden.
 * StapledPages sets width/height and injects header/footer clones.
 * This component only parses and exposes its attributes.
 *
 * Attributes:
 *   skip-header   Boolean    — suppress header on this specific page
 *   skip-footer   Boolean    — suppress footer on this specific page
 *   page-width    CSS length — per-page override (falls back to <stapled-pages> value)
 *   page-height   CSS length — per-page override (falls back to <stapled-pages> value)
 */
export class SPage extends HTMLElement {
  static readonly TAG = 's-page'

  get skipHeader(): boolean {
    return this.hasAttribute('skip-header')
  }

  get skipFooter(): boolean {
    return this.hasAttribute('skip-footer')
  }

  /** Per-page width override, or null to inherit from <stapled-pages>. */
  get pageWidthAttr(): string | null {
    return this.getAttribute('page-width')
  }

  /** Per-page height override, or null to inherit from <stapled-pages>. */
  get pageHeightAttr(): string | null {
    return this.getAttribute('page-height')
  }
}
