import { parseToPx } from './parseToPx.js'

/** Fallback height used when a template omits the required `height` attribute. */
export const DEFAULT_TEMPLATE_HEIGHT_PX = 24

/**
 * Returns the height in px for a template element.
 * The `height` attribute is strongly recommended; callers warn when it is
 * missing and fall back to `DEFAULT_TEMPLATE_HEIGHT_PX` so the doc still builds.
 */
export function measureHeight(template: Element): number {
  const heightAttr = template.getAttribute('height')
  if (heightAttr === null) return DEFAULT_TEMPLATE_HEIGHT_PX
  return parseToPx(heightAttr, template)
}
