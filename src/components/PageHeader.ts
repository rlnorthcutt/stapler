import { PageSlot } from './PageSlot.js'

/**
 * <page-header>
 *
 * Defined once as a direct child of <stapled-pages>. Treated as a template —
 * StapledPages clones it into each page then removes the original from the DOM.
 *
 * This component only parses and exposes its attributes. All DOM manipulation
 * is performed by StapledPages. See PageSlot for the shared attribute API.
 *
 * Attributes:
 *   height      CSS length — if present, used directly (no measurement needed)
 *   skip-first  Boolean   — suppress header on page 1
 *   skip-pages  "1,3,5"   — 1-indexed page numbers to suppress (comma-separated)
 */
export class PageHeader extends PageSlot {
  static readonly TAG = 'page-header'
}
