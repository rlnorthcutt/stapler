/**
 * <page-break>  (Flow mode only)
 *
 * Forces subsequent content to start at the next page's content area.
 * StapledPages computes and sets this element's height during the flow build.
 *
 * Renders a faint dashed top border as an authoring aid (hidden in print).
 * Has no attributes and no public API.
 */
export class PageBreak extends HTMLElement {
  static readonly TAG = 'page-break'
}
