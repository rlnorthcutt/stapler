import { parseToPx } from '../utils/parseToPx.js'
import { measureHeight } from '../utils/measureHeight.js'
import { waitForAssets } from '../utils/waitForAssets.js'
import { PageHeader } from './PageHeader.js'
import { PageFooter } from './PageFooter.js'
import { SPage } from './SPage.js'
import { PageNumber } from './PageNumber.js'

type RenderMode = 'explicit' | 'flow-breaks' | 'flow'

interface StaplerReadyDetail {
  pageCount: number
  mode: RenderMode
  pageWidth: number
  pageHeight: number
}

/**
 * <stapled-doc>
 *
 * Parent wrapper. Reads mode, orchestrates all child processing, builds
 * the final DOM structure, and manages refresh lifecycle.
 *
 * Attributes:
 *   mode         "explicit" | "flow"  (required for AI-generated documents)
 *   page-width   CSS length           default: 8.5in
 *   page-height  CSS length           default: 11in
 *   page-gap     CSS length           default: 2rem
 */
export class Stapler extends HTMLElement {
  static readonly TAG = 'stapled-doc'

  // Stored template references for use during refresh()
  private _headerTemplate: PageHeader | null = null
  private _footerTemplate: PageFooter | null = null
  private _built = false
  private _mode: RenderMode | null = null

  connectedCallback(): void {
    waitForAssets(this).then(() => {
      // One rAF to ensure the browser has performed at least one layout pass
      requestAnimationFrame(() => this._build())
    })
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Re-runs the full build sequence. Call after any meaningful DOM change.
   */
  refresh(): void {
    this._teardown()
    this._build()
  }

  // ─── Attribute helpers ───────────────────────────────────────────────────

  private _pageWidth(): number {
    return parseToPx(this.getAttribute('page-width') ?? '8.5in', this)
  }

  private _pageHeight(): number {
    return parseToPx(this.getAttribute('page-height') ?? '11in', this)
  }

  private _pageGap(): number {
    return parseToPx(this.getAttribute('page-gap') ?? '2rem', this)
  }

  private _detectMode(): RenderMode {
    const attr = this.getAttribute('mode')
    if (attr === 'explicit') return 'explicit'
    if (attr === 'flow') {
      const hasBreaks = this.querySelector('page-spacer') !== null
      return hasBreaks ? 'flow-breaks' : 'flow'
    }
    // Auto-detect fallback (human-authored documents)
    if (this._directChildren('s-page').length > 0) return 'explicit'
    const hasBreaks = this.querySelector('page-spacer') !== null
    return hasBreaks ? 'flow-breaks' : 'flow'
  }

  /** Returns direct children matching a tag name. Avoids :scope > selector. */
  private _directChildren<T extends HTMLElement>(tag: string): T[] {
    return Array.from(this.children).filter(
      (el) => el.tagName.toLowerCase() === tag
    ) as T[]
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  private _build(): void {
    this._mode = this._detectMode()

    const pageW = this._pageWidth()
    const pageH = this._pageHeight()
    const gapH = this._pageGap()

    this.style.setProperty('--sp-page-gap', `${gapH}px`)

    // Locate and store template elements
    this._headerTemplate = this._directChildren<PageHeader>('page-header')[0] ?? null
    this._footerTemplate = this._directChildren<PageFooter>('page-footer')[0] ?? null

    const headerH = this._headerTemplate
      ? measureHeight(this._headerTemplate, pageW)
      : 0
    const footerH = this._footerTemplate
      ? measureHeight(this._footerTemplate, pageW)
      : 0

    if (this._mode === 'explicit') {
      this._buildExplicit(pageW, pageH, headerH, footerH)
    } else {
      this._buildFlow(pageW, pageH, gapH, headerH, footerH)
    }

    this._built = true
  }

  // ─── Explicit mode ───────────────────────────────────────────────────────

  private _buildExplicit(
    pageW: number,
    pageH: number,
    headerH: number,
    footerH: number,
  ): void {
    const pages = Array.from(
      this._directChildren<SPage>('s-page')
    )
    const totalPages = pages.length

    pages.forEach((page, index) => {
      const pageNumber = index + 1

      // Per-page dimension overrides
      const w = page.pageWidthAttr ? parseToPx(page.pageWidthAttr, page) : pageW
      const h = page.pageHeightAttr ? parseToPx(page.pageHeightAttr, page) : pageH

      page.style.width = `${w}px`
      page.style.height = `${h}px`

      // Wrap existing children in .sp-page-content
      const content = document.createElement('div')
      content.className = 'sp-page-content'
      // Move all current children into the content wrapper
      while (page.firstChild) {
        content.appendChild(page.firstChild)
      }
      page.appendChild(content)

      // Stamp header
      if (this._headerTemplate && !page.skipHeader) {
        const visibleOnPage = this._headerTemplate.isVisibleOnPage(pageNumber)
        if (visibleOnPage) {
          const clone = this._cloneTemplate(
            this._headerTemplate,
            pageNumber,
            totalPages,
            headerH,
          )
          page.prepend(clone)
        }
      }

      // Stamp footer
      if (this._footerTemplate && !page.skipFooter) {
        const visibleOnPage = this._footerTemplate.isVisibleOnPage(pageNumber)
        if (visibleOnPage) {
          const clone = this._cloneTemplate(
            this._footerTemplate,
            pageNumber,
            totalPages,
            footerH,
          )
          page.appendChild(clone)
        }
      }
    })

    // Remove template originals from DOM
    this._headerTemplate?.remove()
    this._footerTemplate?.remove()

    this._dispatchReady('explicit', totalPages, pageW, pageH)
  }

  // ─── Flow mode ───────────────────────────────────────────────────────────

  private _buildFlow(
    pageW: number,
    pageH: number,
    gapH: number,
    headerH: number,
    footerH: number,
  ): void {
    const slotH = pageH + gapH

    // Remove templates first so they don't end up in the flow content wrapper
    this._headerTemplate?.remove()
    this._footerTemplate?.remove()

    const wrapper = document.createElement('div')
    wrapper.className = 'sp-flow-wrapper'
    while (this.firstChild) {
      wrapper.appendChild(this.firstChild)
    }
    this.appendChild(wrapper)

    // Size the host
    this.style.width = `${pageW}px`
    this.style.margin = 'auto'
    this.style.position = 'relative'

    // Reserve first page's header zone
    wrapper.style.paddingTop = `${headerH}px`

    const isFlowBreaks = this._mode === 'flow-breaks'

    if (isFlowBreaks) {
      this._processPageBreaks(wrapper, slotH, pageH, headerH, footerH)
    }

    // Allow layout to settle after page-break heights are set
    requestAnimationFrame(() => {
      this._finaliseFlow(wrapper, pageW, pageH, gapH, slotH, headerH, footerH, isFlowBreaks)
    })
  }

  private _finaliseFlow(
    wrapper: HTMLElement,
    pageW: number,
    pageH: number,
    gapH: number,
    slotH: number,
    headerH: number,
    footerH: number,
    isFlowBreaks: boolean,
  ): void {
    if (!isFlowBreaks) {
      // Pure flow: inject spacers at page boundaries
      this._injectPageSpacers(wrapper, slotH, headerH, footerH, gapH)
    }

    const rawH = wrapper.offsetHeight
    let numPages = Math.ceil(rawH / slotH)
    if (numPages < 1) numPages = 1

    // Pad last page to a full slot boundary (no trailing gap on last page)
    const padBottom = numPages * slotH - gapH - wrapper.offsetHeight
    if (padBottom > 0) {
      wrapper.style.paddingBottom = `${padBottom}px`
    }

    // Set host height: N pages + (N-1) gaps
    this.style.height = `${numPages * slotH - gapH}px`

    // Build the frame layer (absolutely-positioned headers/footers)
    this._buildFrameLayer(numPages, slotH, pageH, headerH, footerH)

    const mode = isFlowBreaks ? 'flow-breaks' : 'flow'
    this._dispatchReady(mode, numPages, pageW, pageH)
  }

  /**
   * Process <page-spacer> elements sequentially (not batched).
   * Each element's height is set to bridge its current position to the
   * start of the next page's content area.
   *
   * IMPORTANT: Must remain sequential (set → read → set).
   * See SPEC.md §9 and CLAUDE.md for why batching is wrong here.
   */
  private _processPageBreaks(
    wrapper: HTMLElement,
    slotH: number,
    pageH: number,
    headerH: number,
    footerH: number,
  ): void {
    const breaks = Array.from(wrapper.querySelectorAll<HTMLElement>('page-spacer'))
    const wrapperTop = wrapper.getBoundingClientRect().top

    for (const pb of breaks) {
      // Reset to 0 so getBoundingClientRect gives us the un-padded position
      pb.style.height = '0'

      const pbTop = pb.getBoundingClientRect().top
      const flowY = pbTop - wrapperTop

      const pageIndex = Math.floor(flowY / slotH)
      const nextContentStart = (pageIndex + 1) * slotH + headerH

      const height = nextContentStart - flowY
      pb.style.height = `${Math.max(0, height)}px`
    }
  }

  /**
   * Inject invisible spacer divs at each page boundary so content physically
   * avoids the header/footer/gap zones. No content is ever masked.
   */
  private _injectPageSpacers(
    wrapper: HTMLElement,
    slotH: number,
    headerH: number,
    footerH: number,
    gapH: number,
  ): void {
    const children = Array.from(wrapper.children) as HTMLElement[]
    const wrapperTop = wrapper.getBoundingClientRect().top

    // Track which page boundary we're watching for (1, 2, 3...)
    let nextBoundaryPage = 1

    for (const child of children) {
      const rect = child.getBoundingClientRect()
      let childTop = rect.top - wrapperTop
      const childHeight = rect.height

      // The end of the content zone for the current page
      const contentZoneEnd = nextBoundaryPage * slotH - footerH - gapH

      if (childTop + childHeight > contentZoneEnd) {
        // This child's bottom crossed into the footer/gap/header zone.
        // Insert a spacer BEFORE this child to push it to the next content zone.
        const nextContentStart = nextBoundaryPage * slotH + headerH
        const spacerH = nextContentStart - childTop

        if (spacerH > 0) {
          const spacer = document.createElement('div')
          spacer.className = 'sp-page-spacer'
          spacer.style.height = `${spacerH}px`
          wrapper.insertBefore(spacer, child)
          childTop = nextContentStart
        }

        nextBoundaryPage++
      }

      // Advance past any additional boundaries this child's bottom crosses,
      // so the next child is checked against the correct page.
      while (childTop + childHeight > nextBoundaryPage * slotH - footerH - gapH) {
        nextBoundaryPage++
      }
    }
  }

  /**
   * Build the absolutely-positioned frame layer with per-page header/footer clones.
   */
  private _buildFrameLayer(
    numPages: number,
    slotH: number,
    pageH: number,
    headerH: number,
    footerH: number,
  ): void {
    const layer = document.createElement('div')
    layer.className = 'sp-frame-layer'

    for (let i = 0; i < numPages; i++) {
      const pageNumber = i + 1
      const frame = document.createElement('div')
      frame.className = 'sp-page-frame'
      frame.style.top = `${i * slotH}px`
      frame.style.height = `${pageH}px`

      if (this._headerTemplate) {
        const visible = this._headerTemplate.isVisibleOnPage(pageNumber)
        if (visible) {
          const wrapper = document.createElement('div')
          wrapper.className = 'sp-frame-header'
          wrapper.style.height = `${headerH}px`
          wrapper.appendChild(
            this._cloneTemplate(this._headerTemplate, pageNumber, numPages, headerH)
          )
          frame.appendChild(wrapper)
        }
      }

      if (this._footerTemplate) {
        const visible = this._footerTemplate.isVisibleOnPage(pageNumber)
        if (visible) {
          const wrapper = document.createElement('div')
          wrapper.className = 'sp-frame-footer'
          wrapper.style.height = `${footerH}px`
          wrapper.appendChild(
            this._cloneTemplate(this._footerTemplate, pageNumber, numPages, footerH)
          )
          frame.appendChild(wrapper)
        }
      }

      layer.appendChild(frame)
    }

    this.appendChild(layer)
  }

  // ─── Template cloning ────────────────────────────────────────────────────

  /**
   * Clone a template element, strip control attributes, set height,
   * and resolve all <page-number> placeholders.
   */
  private _cloneTemplate(
    template: Element,
    pageNumber: number,
    totalPages: number,
    height: number,
  ): Element {
    const clone = template.cloneNode(true) as Element

    // Strip library control attributes — leave author attributes intact
    clone.removeAttribute('height')
    clone.removeAttribute('skip-first')
    clone.removeAttribute('skip-pages')

    // Apply explicit height
    ;(clone as HTMLElement).style.height = `${height}px`

    // Resolve <page-number> placeholders
    const pageNumbers = clone.querySelectorAll<PageNumber>('page-number')
    pageNumbers.forEach((pn) => pn.resolve(pageNumber, totalPages))

    return clone
  }

  // ─── Teardown ────────────────────────────────────────────────────────────

  private _teardown(): void {
    if (!this._built) return

    if (this._mode === 'explicit') {
      this._teardownExplicit()
    } else {
      this._teardownFlow()
    }

    this._built = false
    this._mode = null
  }

  private _teardownExplicit(): void {
    // Re-add template stubs so _build() can find and re-read them
    if (this._headerTemplate) this.prepend(this._headerTemplate)
    if (this._footerTemplate) {
      // Insert after header template (or at start if no header)
      const ref = this._headerTemplate
        ? this._headerTemplate.nextSibling
        : this.firstChild
      this.insertBefore(this._footerTemplate, ref)
    }

    // For each s-page: remove cloned headers/footers, unwrap .sp-page-content
    const pages = this._directChildren<SPage>('s-page')
    for (const page of pages) {
      // Remove stamped clones (page-header and page-footer direct children)
      Array.from(page.children).forEach((child) => {
        if (
          child.tagName.toLowerCase() === 'page-header' ||
          child.tagName.toLowerCase() === 'page-footer'
        ) {
          child.remove()
        }
      })

      // Unwrap .sp-page-content
      const contentDiv = Array.from(page.children).find(
        (el) => el.classList.contains('sp-page-content')
      ) as HTMLElement | undefined
      if (contentDiv) {
        while (contentDiv.firstChild) {
          page.insertBefore(contentDiv.firstChild, contentDiv)
        }
        contentDiv.remove()
      }

      // Reset inline dimensions
      page.style.width = ''
      page.style.height = ''
    }
  }

  private _teardownFlow(): void {
    // Remove frame layer
    this.querySelector('.sp-frame-layer')?.remove()

    // Unwrap flow wrapper
    const wrapper = this.querySelector<HTMLElement>('.sp-flow-wrapper')
    if (wrapper) {
      // Re-add template stubs before unwrapping
      if (this._headerTemplate) wrapper.prepend(this._headerTemplate)
      if (this._footerTemplate) wrapper.appendChild(this._footerTemplate)

      // Remove injected spacers
      wrapper.querySelectorAll('.sp-page-spacer').forEach((s) => s.remove())

      // Reset page-break heights
      wrapper.querySelectorAll<HTMLElement>('page-spacer').forEach((pb) => {
        pb.style.height = ''
      })

      // Unwrap
      while (wrapper.firstChild) {
        this.insertBefore(wrapper.firstChild, wrapper)
      }
      wrapper.remove()
    }

    // Reset host styles
    this.style.width = ''
    this.style.height = ''
    this.style.margin = ''
    this.style.position = ''
  }

  // ─── Events ──────────────────────────────────────────────────────────────

  private _dispatchReady(
    mode: RenderMode,
    pageCount: number,
    pageWidth: number,
    pageHeight: number,
  ): void {
    const detail: StaplerReadyDetail = { pageCount, mode, pageWidth, pageHeight }
    this.dispatchEvent(
      new CustomEvent<StaplerReadyDetail>('sp:ready', { detail, bubbles: true })
    )
  }
}
