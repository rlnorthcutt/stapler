import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { StapledPages } from '../src/components/StapledPages.js'
import { PageHeader } from '../src/components/PageHeader.js'
import { PageFooter } from '../src/components/PageFooter.js'
import { SPage } from '../src/components/SPage.js'
import { PageNumber } from '../src/components/PageNumber.js'

// ── Register custom elements once ────────────────────────────────────────────
beforeAll(() => {
  if (!customElements.get('stapled-pages')) customElements.define('stapled-pages', StapledPages)
  if (!customElements.get('page-header'))   customElements.define('page-header', PageHeader)
  if (!customElements.get('page-footer'))   customElements.define('page-footer', PageFooter)
  if (!customElements.get('s-page'))        customElements.define('s-page', SPage)
  if (!customElements.get('page-number'))   customElements.define('page-number', PageNumber)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a <stapled-pages> element and invoke _build() synchronously for testing. */
function buildExplicit(html: string): StapledPages {
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  const sp = container.querySelector('stapled-pages') as StapledPages
  // Bypass the async connectedCallback timing fence
  ;(sp as unknown as { _build(): void })._build()
  return sp
}

function stubLayout(): void {
  // happy-dom returns 0 for offsetHeight; stub measureHeight's off-screen clone
  vi.spyOn(window, 'getComputedStyle').mockReturnValue(
    { fontSize: '16px' } as CSSStyleDeclaration
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Explicit mode build', () => {
  beforeEach(() => stubLayout())

  it('detects explicit mode from <s-page> children', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="32px">
        <s-page><p>Content</p></s-page>
      </stapled-pages>
    `)
    expect((sp as unknown as { _mode: string })._mode).toBe('explicit')
  })

  it('sets width and height on each <s-page>', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <s-page><p>A</p></s-page>
        <s-page><p>B</p></s-page>
      </stapled-pages>
    `)
    const pages = sp.querySelectorAll('s-page')
    pages.forEach((p) => {
      expect((p as HTMLElement).style.width).toBe('816px')
      expect((p as HTMLElement).style.height).toBe('1056px')
    })
  })

  it('wraps page children in .sp-page-content', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <s-page><p>Hello</p><p>World</p></s-page>
      </stapled-pages>
    `)
    const content = sp.querySelector('.sp-page-content')
    expect(content).not.toBeNull()
    expect(content!.querySelectorAll('p').length).toBe(2)
  })

  it('stamps header clone into each page', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <page-header height="48px"><div class="hdr">Header</div></page-header>
        <s-page><p>A</p></s-page>
        <s-page><p>B</p></s-page>
      </stapled-pages>
    `)
    const pages = sp.querySelectorAll('s-page')
    pages.forEach((page) => {
      const hdr = page.querySelector('page-header')
      expect(hdr).not.toBeNull()
      expect(hdr!.querySelector('.hdr')).not.toBeNull()
    })
  })

  it('stamps footer clone into each page', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <page-footer height="32px"><div class="ftr">Footer</div></page-footer>
        <s-page><p>A</p></s-page>
      </stapled-pages>
    `)
    const ftr = sp.querySelector('s-page page-footer')
    expect(ftr).not.toBeNull()
    expect(ftr!.querySelector('.ftr')).not.toBeNull()
  })

  it('removes original template elements after build', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <page-header height="48px"><span>H</span></page-header>
        <page-footer height="32px"><span>F</span></page-footer>
        <s-page><p>A</p></s-page>
      </stapled-pages>
    `)
    // Direct children of stapled-pages should not include template originals
    const directHeader = sp.querySelector(':scope > page-header')
    const directFooter = sp.querySelector(':scope > page-footer')
    expect(directHeader).toBeNull()
    expect(directFooter).toBeNull()
  })

  it('skip-first suppresses header on page 1 only', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <page-header height="48px" skip-first><span>H</span></page-header>
        <s-page id="p1"><p>A</p></s-page>
        <s-page id="p2"><p>B</p></s-page>
      </stapled-pages>
    `)
    const page1 = sp.querySelector('#p1')!
    const page2 = sp.querySelector('#p2')!
    expect(page1.querySelector('page-header')).toBeNull()
    expect(page2.querySelector('page-header')).not.toBeNull()
  })

  it('skip-pages suppresses header on specified pages', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <page-header height="48px" skip-pages="2"><span>H</span></page-header>
        <s-page id="p1"><p>A</p></s-page>
        <s-page id="p2"><p>B</p></s-page>
        <s-page id="p3"><p>C</p></s-page>
      </stapled-pages>
    `)
    expect(sp.querySelector('#p1 page-header')).not.toBeNull()
    expect(sp.querySelector('#p2 page-header')).toBeNull()
    expect(sp.querySelector('#p3 page-header')).not.toBeNull()
  })

  it('skip-header on <s-page> suppresses header for that page', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <page-header height="48px"><span>H</span></page-header>
        <s-page id="p1" skip-header><p>A</p></s-page>
        <s-page id="p2"><p>B</p></s-page>
      </stapled-pages>
    `)
    expect(sp.querySelector('#p1 page-header')).toBeNull()
    expect(sp.querySelector('#p2 page-header')).not.toBeNull()
  })

  it('resolves <page-number> in header clones', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <page-header height="48px">
          Page <page-number format="n of total"></page-number>
        </page-header>
        <s-page><p>A</p></s-page>
        <s-page><p>B</p></s-page>
      </stapled-pages>
    `)
    const headers = sp.querySelectorAll('s-page page-header')
    expect(headers[0]!.querySelector('page-number')!.textContent).toBe('1 of 2')
    expect(headers[1]!.querySelector('page-number')!.textContent).toBe('2 of 2')
  })

  it('header clone does not retain control attributes', () => {
    // Two pages so page 2 gets the header (skip-first suppresses only page 1)
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <page-header height="48px" skip-first skip-pages="3"><span>H</span></page-header>
        <s-page id="p1"><p>A</p></s-page>
        <s-page id="p2"><p>B</p></s-page>
      </stapled-pages>
    `)
    // Page 1 has no header (skip-first); page 2 should have one
    const clone = sp.querySelector('#p2 page-header')!
    expect(clone).not.toBeNull()
    expect(clone.hasAttribute('height')).toBe(false)
    expect(clone.hasAttribute('skip-first')).toBe(false)
    expect(clone.hasAttribute('skip-pages')).toBe(false)
  })

  it('per-page size override applies to that page only', () => {
    const sp = buildExplicit(`
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <s-page id="p1"><p>Normal</p></s-page>
        <s-page id="p2" page-width="1056px" page-height="816px"><p>Landscape</p></s-page>
      </stapled-pages>
    `)
    const p1 = sp.querySelector<HTMLElement>('#p1')!
    const p2 = sp.querySelector<HTMLElement>('#p2')!
    expect(p1.style.width).toBe('816px')
    expect(p1.style.height).toBe('1056px')
    expect(p2.style.width).toBe('1056px')
    expect(p2.style.height).toBe('816px')
  })

  it('dispatches sp:ready with correct detail', () => {
    const events: CustomEvent[] = []
    const container = document.createElement('div')
    container.innerHTML = `
      <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
        <s-page><p>A</p></s-page>
        <s-page><p>B</p></s-page>
        <s-page><p>C</p></s-page>
      </stapled-pages>
    `
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-pages') as StapledPages
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))
    ;(sp as unknown as { _build(): void })._build()

    expect(events).toHaveLength(1)
    expect(events[0]!.detail.pageCount).toBe(3)
    expect(events[0]!.detail.mode).toBe('explicit')
    expect(events[0]!.detail.pageWidth).toBe(816)
    expect(events[0]!.detail.pageHeight).toBe(1056)
  })

  describe('refresh()', () => {
    it('cleans up and rebuilds cleanly', () => {
      const sp = buildExplicit(`
        <stapled-pages mode="explicit" page-width="816px" page-height="1056px" page-gap="0px">
          <page-header height="48px"><span>H</span></page-header>
          <s-page><p>Content</p></s-page>
        </stapled-pages>
      `)

      // First build: header should be in page
      expect(sp.querySelector('s-page page-header')).not.toBeNull()

      // Rebuild
      sp.refresh()

      // After refresh: exactly one header clone per page, not doubled
      const headers = sp.querySelectorAll('s-page page-header')
      expect(headers.length).toBe(1)

      // Content wrapper should exist once
      const contentDivs = sp.querySelectorAll('.sp-page-content')
      expect(contentDivs.length).toBe(1)
    })
  })
})
