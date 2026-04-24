import { PageSlot } from './PageSlot.js'

/**
 * <page-footer>
 *
 * Same template pattern as <page-header>. See PageHeader and PageSlot for
 * full documentation.
 *
 * Attributes:
 *   height      CSS length — if present, used directly (no measurement needed)
 *   skip-first  Boolean   — suppress footer on page 1
 *   skip-pages  "1,3,5"   — 1-indexed page numbers to suppress (comma-separated)
 */
export class PageFooter extends PageSlot {
  static readonly TAG = 'page-footer'
}
