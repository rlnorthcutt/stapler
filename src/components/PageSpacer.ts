/**
 * <page-spacer>  (Flow mode only)
 *
 * Forces subsequent content to start at the next page's content area.
 * Stapler computes and sets this element's height during the flow build.
 *
 * Renders a faint dashed top border as an authoring aid (hidden in print).
 * Has no attributes and no public API.
 */
export class PageSpacer extends HTMLElement {
  static readonly TAG = 'page-spacer'
}
