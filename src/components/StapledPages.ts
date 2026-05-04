import { parseToPx } from '../utils/parseToPx.js'
import { measureHeight } from '../utils/measureHeight.js'
import { waitForAssets } from '../utils/waitForAssets.js'
import { CORE_CSS } from '../css.js'
import { PageHeader } from './PageHeader.js'
import { PageFooter } from './PageFooter.js'
import { SPage } from './SPage.js'
import { SPageBody } from './SPageBody.js'
import { PageNumber } from './PageNumber.js'

interface StaplerReadyDetail {
  pageCount: number
  pageWidth: number
  pageHeight: number
}

/**
 * <stapled-doc>
 *
 * Root wrapper. Reads dimensions, orchestrates all child processing,
 * builds the final DOM structure, and manages refresh lifecycle.
 *
 * Attributes:
 *   page-width   CSS length  (required)
 *   page-height  CSS length  (required)
 *   page-gap     CSS length  default: 2rem
 *   preview      "print"     optional: removes gap and shadows
 */
export class Stapler extends HTMLElement {
  static readonly TAG = 'stapled-doc'

  private _headerTemplate: PageHeader | null = null
  private _footerTemplate: PageFooter | null = null
  private _built = false
  private _pageStyleEl: HTMLStyleElement | null = null
  private _shadowInitialized = false

  // When embed mode is active, all authored content lives in the shadow root.
  // This getter lets build/teardown code operate on the right container without
  // branching everywhere.
  private get _contentRoot(): Element | ShadowRoot {
    return this.shadowRoot ?? this
  }

  connectedCallback(): void {
    if (this.hasAttribute('embed')) {
      this._initEmbedMode()
    }
    const assetRoot = this.shadowRoot ?? this
    waitForAssets(assetRoot).then(() => {
      requestAnimationFrame(() => this._build())
    })
  }

  // Attaches a shadow root, injects structural CSS, injects any author-supplied
  // stylesheets (via `stylesheet` attribute or <link>/<style> children), then
  // moves all remaining light-DOM children into the shadow root so they are
  // isolated from the parent page's CSS.
  private _initEmbedMode(): void {
    if (this._shadowInitialized) return

    const shadow = this.attachShadow({ mode: 'open' })

    // Structural CSS scoped to this shadow root instead of <head>
    const coreStyle = document.createElement('style')
    coreStyle.textContent = CORE_CSS
    shadow.appendChild(coreStyle)

    // `stylesheet="a.css, b.css"` convenience attribute — one or more URLs
    const stylesheetAttr = this.getAttribute('stylesheet')
    if (stylesheetAttr) {
      for (const href of stylesheetAttr.split(',').map((s) => s.trim()).filter(Boolean)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        shadow.appendChild(link)
      }
    }

    // Move all light-DOM children (<style>, <link>, <page-header>, <s-page>, …)
    // into the shadow root in document order.
    while (this.firstChild) {
      shadow.appendChild(this.firstChild)
    }

    this._shadowInitialized = true
  }

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
    if (this.getAttribute('preview') === 'print') return 0
    return parseToPx(this.getAttribute('page-gap') ?? '2rem', this)
  }

  private _directChildren<T extends HTMLElement>(tag: string): T[] {
    return Array.from(this._contentRoot.children).filter(
      (el) => el.tagName.toLowerCase() === tag
    ) as T[]
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  private _build(): void {
    // Deprecation error for removed flow mode
    const modeAttr = this.getAttribute('mode')
    if (modeAttr === 'flow') {
      console.error(
        '[stapler] mode="flow" has been removed in v0.5.0. ' +
        'Convert to explicit mode by wrapping your content in <s-page> elements, ' +
        'or pin to v0.4.x if you need flow mode.'
      )
      return
    }

    // page-width and page-height are required
    if (!this.getAttribute('page-width')) {
      console.error('[stapler] <stapled-doc> requires a page-width attribute (e.g. page-width="8.5in").')
      return
    }
    if (!this.getAttribute('page-height')) {
      console.error('[stapler] <stapled-doc> requires a page-height attribute (e.g. page-height="11in").')
      return
    }

    const pageW = this._pageWidth()
    const pageH = this._pageHeight()
    const gapH = this._pageGap()

    this.style.setProperty('--sp-page-gap', `${gapH}px`)

    // Inject @page rule so authors don't need to add it manually
    this._pageStyleEl?.remove()
    const pageStyle = document.createElement('style')
    pageStyle.textContent = `@page { size: ${pageW}px ${pageH}px; margin: 0; }`
    document.head.appendChild(pageStyle)
    this._pageStyleEl = pageStyle

    // Locate and store template elements
    this._headerTemplate = this._directChildren<PageHeader>('page-header')[0] ?? null
    this._footerTemplate = this._directChildren<PageFooter>('page-footer')[0] ?? null

    // height is required on templates
    if (this._headerTemplate && !this._headerTemplate.heightAttr) {
      console.error('[stapler] <page-header> requires a height attribute (e.g. height="48px").')
      return
    }
    if (this._footerTemplate && !this._footerTemplate.heightAttr) {
      console.error('[stapler] <page-footer> requires a height attribute (e.g. height="32px").')
      return
    }

    const headerH = this._headerTemplate ? measureHeight(this._headerTemplate) : 0
    const footerH = this._footerTemplate ? measureHeight(this._footerTemplate) : 0

    this._buildExplicit(pageW, pageH, headerH, footerH)
    this._built = true
  }

  // ─── Explicit mode ───────────────────────────────────────────────────────

  private _buildExplicit(
    pageW: number,
    pageH: number,
    headerH: number,
    footerH: number,
  ): void {
    const pages = Array.from(this._directChildren<SPage>('s-page'))
    const totalPages = pages.length

    pages.forEach((page, index) => {
      const pageNumber = index + 1

      // Per-page dimension overrides
      const w = page.pageWidthAttr ? parseToPx(page.pageWidthAttr, page) : pageW
      const h = page.pageHeightAttr ? parseToPx(page.pageHeightAttr, page) : pageH

      page.style.width = `${w}px`
      page.style.height = `${h}px`

      // Extract any per-page header/footer override before wrapping content
      const perPageHeader = Array.from(page.children).find(
        (c) => c.tagName.toLowerCase() === 'page-header'
      ) as PageHeader | undefined
      const perPageFooter = Array.from(page.children).find(
        (c) => c.tagName.toLowerCase() === 'page-footer'
      ) as PageFooter | undefined

      // Check for existing authored <s-page-body>
      const existingBody = Array.from(page.children).find(
        (c) => c.tagName.toLowerCase() === 's-page-body'
      ) as SPageBody | undefined

      if (existingBody) {
        // Author-placed body: just pull out per-page header/footer
        if (perPageHeader) perPageHeader.remove()
        if (perPageFooter) perPageFooter.remove()
      } else {
        // Auto-wrap: create <s-page-body> and move all non-header/footer children into it
        const body = document.createElement('s-page-body') as SPageBody
        body.setAttribute('data-sp-autowrap', '')
        while (page.firstChild) {
          const child = page.firstChild as HTMLElement
          if (child === perPageHeader || child === perPageFooter) {
            page.removeChild(child)
          } else {
            body.appendChild(child)
          }
        }
        page.appendChild(body)
      }

      // Stamp header: per-page override takes precedence over global template
      if (perPageHeader) {
        const hH = perPageHeader.heightAttr ? parseToPx(perPageHeader.heightAttr, perPageHeader) : headerH
        perPageHeader.style.height = `${hH}px`
        perPageHeader.querySelectorAll<PageNumber>('page-number').forEach(
          (pn) => pn.resolve(pageNumber, totalPages)
        )
        page.prepend(perPageHeader)
      } else if (this._headerTemplate && !page.skipHeader) {
        const visibleOnPage = this._headerTemplate.isVisibleOnPage(pageNumber)
        if (visibleOnPage) {
          const clone = this._cloneTemplate(this._headerTemplate, pageNumber, totalPages, headerH)
          ;(clone as HTMLElement).dataset.spClone = ''
          page.prepend(clone)
        }
      }

      // Stamp footer: per-page override takes precedence over global template
      if (perPageFooter) {
        const fH = perPageFooter.heightAttr ? parseToPx(perPageFooter.heightAttr, perPageFooter) : footerH
        perPageFooter.style.height = `${fH}px`
        perPageFooter.querySelectorAll<PageNumber>('page-number').forEach(
          (pn) => pn.resolve(pageNumber, totalPages)
        )
        page.appendChild(perPageFooter)
      } else if (this._footerTemplate && !page.skipFooter) {
        const visibleOnPage = this._footerTemplate.isVisibleOnPage(pageNumber)
        if (visibleOnPage) {
          const clone = this._cloneTemplate(this._footerTemplate, pageNumber, totalPages, footerH)
          ;(clone as HTMLElement).dataset.spClone = ''
          page.appendChild(clone)
        }
      }
    })

    // Remove template originals from DOM
    this._headerTemplate?.remove()
    this._footerTemplate?.remove()

    this._dispatchReady(totalPages, pageW, pageH)
  }

  // ─── Template cloning ────────────────────────────────────────────────────

  private _cloneTemplate(
    template: Element,
    pageNumber: number,
    totalPages: number,
    height: number,
  ): Element {
    const clone = template.cloneNode(true) as Element
    clone.removeAttribute('height')
    clone.removeAttribute('skip-first')
    clone.removeAttribute('skip-pages')
    ;(clone as HTMLElement).style.height = `${height}px`
    const pageNumbers = clone.querySelectorAll<PageNumber>('page-number')
    pageNumbers.forEach((pn) => pn.resolve(pageNumber, totalPages))
    return clone
  }

  // ─── Teardown ────────────────────────────────────────────────────────────

  private _teardown(): void {
    if (!this._built) return

    const root = this._contentRoot

    // Re-add template stubs so _build() can find and re-read them
    if (this._headerTemplate) root.prepend(this._headerTemplate)
    if (this._footerTemplate) {
      const ref = this._headerTemplate
        ? this._headerTemplate.nextSibling
        : root.firstChild
      root.insertBefore(this._footerTemplate, ref)
    }

    const pages = this._directChildren<SPage>('s-page')
    for (const page of pages) {
      // Remove only injected clones (not per-page authored overrides)
      Array.from(page.children).forEach((child) => {
        if (
          (child.tagName.toLowerCase() === 'page-header' ||
            child.tagName.toLowerCase() === 'page-footer') &&
          child.hasAttribute('data-sp-clone')
        ) {
          child.remove()
        }
      })

      // Unwrap auto-created <s-page-body> only; leave authored ones in place
      const autoBody = Array.from(page.children).find(
        (el) =>
          el.tagName.toLowerCase() === 's-page-body' &&
          el.hasAttribute('data-sp-autowrap')
      ) as HTMLElement | undefined
      if (autoBody) {
        while (autoBody.firstChild) {
          page.insertBefore(autoBody.firstChild, autoBody)
        }
        autoBody.remove()
      }

      // Reset inline dimensions
      page.style.width = ''
      page.style.height = ''
    }

    this._pageStyleEl?.remove()
    this._pageStyleEl = null
    this._built = false
  }

  // ─── Events ──────────────────────────────────────────────────────────────

  private _dispatchReady(
    pageCount: number,
    pageWidth: number,
    pageHeight: number,
  ): void {
    const detail: StaplerReadyDetail = { pageCount, pageWidth, pageHeight }
    this.dispatchEvent(
      new CustomEvent<StaplerReadyDetail>('sp:ready', { detail, bubbles: true })
    )
  }
}
