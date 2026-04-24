import { parseToPx } from './parseToPx.js'

/**
 * Measure the rendered height of a template element.
 *
 * If the element has a `height` attribute, parse it directly via parseToPx.
 * Otherwise, clone it into a hidden off-screen container at the given width,
 * measure offsetHeight, and clean up.
 *
 * @param template  The <page-header> or <page-footer> element to measure
 * @param pageWidth Page width in px — used as the container width when measuring
 * @returns         Height in px
 */
export function measureHeight(template: Element, pageWidth: number): number {
  const heightAttr = template.getAttribute('height')
  if (heightAttr !== null) {
    return parseToPx(heightAttr, template)
  }

  const container = document.createElement('div')
  container.style.cssText = [
    'position:fixed',
    'top:-9999px',
    'left:-9999px',
    'visibility:hidden',
    `width:${pageWidth}px`,
    'pointer-events:none',
  ].join(';')

  const clone = template.cloneNode(true) as Element
  // Remove control attributes so they don't affect layout
  clone.removeAttribute('height')
  clone.removeAttribute('skip-first')
  clone.removeAttribute('skip-pages')

  container.appendChild(clone)
  document.body.appendChild(container)

  const height = (container.firstElementChild as HTMLElement).offsetHeight

  document.body.removeChild(container)

  return height
}
