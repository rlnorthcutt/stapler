import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { StapledPages } from '../src/components/StapledPages.js'
import { PageHeader } from '../src/components/PageHeader.js'
import { PageFooter } from '../src/components/PageFooter.js'
import { PageBreak } from '../src/components/PageBreak.js'
import { PageNumber } from '../src/components/PageNumber.js'

// ── Register custom elements once ────────────────────────────────────────────
beforeAll(() => {
  if (!customElements.get('stapled-pages')) customElements.define('stapled-pages', StapledPages)
  if (!customElements.get('page-header'))   customElements.define('page-header', PageHeader)
  if (!customElements.get('page-footer'))   customElements.define('page-footer', PageFooter)
  if (!customElements.get('page-break'))    customElements.define('page-break', PageBreak)
  if (!customElements.get('page-number'))   customElements.define('page-number', PageNumber)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

function stubComputedStyle(): void {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue(
    { fontSize: '16px' } as CSSStyleDeclaration
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// _injectPageSpacers
//
// slotH = pageH + gapH = 1056 + 32 = 1088
// Page 1 content zone: 0 → (1*1088 - 32 - 32) = 1024
// Page 2 content zone: (1*1088 + 48) = 1136 → (2*1088 - 32 - 32) = 2112
// Page 3 content zone: (2*1088 + 48) = 2224 → (3*1088 - 32 - 32) = 3200
// ─────────────────────────────────────────────────────────────────────────────

describe('_injectPageSpacers', () => {
  const slotH   = 1088
  const headerH = 48
  const footerH = 32
  const gapH    = 32

  type InjectFn = (
    wrapper: HTMLElement,
    slotH: number,
    headerH: number,
    footerH: number,
    gapH: number,
  ) => void

  function callInject(wrapper: HTMLElement): void {
    const sp = document.createElement('stapled-pages') as StapledPages
    ;(sp as unknown as { _injectPageSpacers: InjectFn })
      ._injectPageSpacers(wrapper, slotH, headerH, footerH, gapH)
  }

  function makeChild(top: number, height: number): HTMLElement {
    const el = document.createElement('div')
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top, bottom: top + height, height,
      left: 0, right: 0, width: 816, x: 0, y: top, toJSON: () => ({}),
    })
    return el
  }

  function makeWrapper(...rects: Array<{ top: number; height: number }>): HTMLElement {
    const wrapper = document.createElement('div')
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(
      { top: 0, bottom: 0, height: 0, left: 0, right: 0, width: 816, x: 0, y: 0, toJSON: () => ({}) }
    )
    rects.forEach((r) => wrapper.appendChild(makeChild(r.top, r.height)))
    document.body.appendChild(wrapper)
    return wrapper
  }

  it('inserts no spacer when child fits within content zone', () => {
    // bottom = 0 + 500 = 500 < 1024 — fits
    const wrapper = makeWrapper({ top: 0, height: 500 })
    callInject(wrapper)
    expect(wrapper.querySelectorAll('.sp-page-spacer').length).toBe(0)
  })

  it('inserts a spacer when child bottom crosses content zone end', () => {
    // bottom = 900 + 200 = 1100 > 1024 — crosses zone 1
    // spacerH = nextContentStart − childTop = 1136 − 900 = 236
    const wrapper = makeWrapper({ top: 900, height: 200 })
    callInject(wrapper)

    const spacers = wrapper.querySelectorAll<HTMLElement>('.sp-page-spacer')
    expect(spacers.length).toBe(1)
    expect(spacers[0]!.style.height).toBe('236px')
  })

  it('inserts the spacer immediately before the crossing child', () => {
    const wrapper = makeWrapper({ top: 900, height: 200 })
    callInject(wrapper)

    const child = wrapper.lastElementChild!
    expect(child.previousElementSibling?.classList.contains('sp-page-spacer')).toBe(true)
  })

  it('inserts separate spacers for two children crossing different page boundaries', () => {
    // child1 bottom = 900 + 200 = 1100 > 1024 — crosses zone 1
    // child2 bottom = 2000 + 200 = 2200 > 2112 — crosses zone 2
    const wrapper = makeWrapper(
      { top: 900, height: 200 },
      { top: 2000, height: 200 },
    )
    callInject(wrapper)
    expect(wrapper.querySelectorAll('.sp-page-spacer').length).toBe(2)
  })

  it('inserts only one spacer for a tall child and advances the boundary for the next child', () => {
    // Tall child: top=0, height=2500
    //   crosses zone 1 → spacer inserted, childTop becomes 1136
    //   childBottom = 1136 + 2500 = 3636
    //   advances past zone 2 (end=2112) and zone 3 (end=3200) → nextBoundaryPage=4
    // Short child: top=3700, height=100
    //   contentZoneEnd for page 4 = 4*1088 − 32 − 32 = 4288
    //   childBottom = 3800 < 4288 — fits, no spacer
    const wrapper = makeWrapper(
      { top: 0,    height: 2500 },
      { top: 3700, height: 100  },
    )
    callInject(wrapper)
    expect(wrapper.querySelectorAll('.sp-page-spacer').length).toBe(1)
  })

  it('does not double-insert when child lands exactly at content start after push', () => {
    // child top = 1136 (already at nextContentStart), height = 100
    // spacerH would be 1136 − 1136 = 0 → skipped; nextBoundaryPage advances
    const wrapper = makeWrapper({ top: 1136, height: 100 })
    callInject(wrapper)
    expect(wrapper.querySelectorAll('.sp-page-spacer').length).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// _buildFrameLayer
// ─────────────────────────────────────────────────────────────────────────────

describe('_buildFrameLayer', () => {
  const slotH   = 1088
  const pageH   = 1056
  const headerH = 48
  const footerH = 32

  type BuildFrameFn = (
    numPages: number,
    slotH: number,
    pageH: number,
    headerH: number,
    footerH: number,
  ) => void

  function callBuildFrame(sp: StapledPages, numPages: number): void {
    ;(sp as unknown as { _buildFrameLayer: BuildFrameFn })
      ._buildFrameLayer(numPages, slotH, pageH, headerH, footerH)
  }

  beforeEach(() => stubComputedStyle())

  function makeStapledPages(html: string): StapledPages {
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    return container.querySelector('stapled-pages') as StapledPages
  }

  it('appends a .sp-frame-layer with one .sp-page-frame per page', () => {
    const sp = makeStapledPages(`<stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px"></stapled-pages>`)
    callBuildFrame(sp, 3)

    expect(sp.querySelector('.sp-frame-layer')).not.toBeNull()
    expect(sp.querySelectorAll('.sp-page-frame').length).toBe(3)
  })

  it('sets correct top offset for each frame (i * slotH)', () => {
    const sp = makeStapledPages(`<stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px"></stapled-pages>`)
    callBuildFrame(sp, 3)

    const frames = Array.from(sp.querySelectorAll<HTMLElement>('.sp-page-frame'))
    expect(frames[0]!.style.top).toBe('0px')
    expect(frames[1]!.style.top).toBe(`${slotH}px`)
    expect(frames[2]!.style.top).toBe(`${2 * slotH}px`)
  })

  it('sets frame height to pageH', () => {
    const sp = makeStapledPages(`<stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px"></stapled-pages>`)
    callBuildFrame(sp, 2)

    sp.querySelectorAll<HTMLElement>('.sp-page-frame').forEach((frame) => {
      expect(frame.style.height).toBe(`${pageH}px`)
    })
  })

  it('stamps header and footer clones into each frame when templates are set', () => {
    const sp = makeStapledPages(`
      <stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px">
        <page-header height="48px"><span>H</span></page-header>
        <page-footer height="32px"><span>F</span></page-footer>
      </stapled-pages>
    `)
    ;(sp as unknown as { _headerTemplate: PageHeader | null })._headerTemplate =
      sp.querySelector('page-header') as PageHeader
    ;(sp as unknown as { _footerTemplate: PageFooter | null })._footerTemplate =
      sp.querySelector('page-footer') as PageFooter

    callBuildFrame(sp, 2)

    sp.querySelectorAll('.sp-page-frame').forEach((frame) => {
      expect(frame.querySelector('.sp-frame-header')).not.toBeNull()
      expect(frame.querySelector('.sp-frame-footer')).not.toBeNull()
    })
  })

  it('header wrapper height matches headerH', () => {
    const sp = makeStapledPages(`
      <stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px">
        <page-header height="48px"><span>H</span></page-header>
      </stapled-pages>
    `)
    ;(sp as unknown as { _headerTemplate: PageHeader | null })._headerTemplate =
      sp.querySelector('page-header') as PageHeader

    callBuildFrame(sp, 1)

    const headerWrapper = sp.querySelector<HTMLElement>('.sp-frame-header')
    expect(headerWrapper!.style.height).toBe(`${headerH}px`)
  })

  it('skip-first on header — page 1 frame has no header, pages 2+ do', () => {
    const sp = makeStapledPages(`
      <stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px">
        <page-header height="48px" skip-first><span>H</span></page-header>
      </stapled-pages>
    `)
    ;(sp as unknown as { _headerTemplate: PageHeader | null })._headerTemplate =
      sp.querySelector('page-header') as PageHeader

    callBuildFrame(sp, 3)

    const frames = Array.from(sp.querySelectorAll('.sp-page-frame'))
    expect(frames[0]!.querySelector('.sp-frame-header')).toBeNull()
    expect(frames[1]!.querySelector('.sp-frame-header')).not.toBeNull()
    expect(frames[2]!.querySelector('.sp-frame-header')).not.toBeNull()
  })

  it('skip-pages on footer — specified page frame has no footer', () => {
    const sp = makeStapledPages(`
      <stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px">
        <page-footer height="32px" skip-pages="2"><span>F</span></page-footer>
      </stapled-pages>
    `)
    ;(sp as unknown as { _footerTemplate: PageFooter | null })._footerTemplate =
      sp.querySelector('page-footer') as PageFooter

    callBuildFrame(sp, 3)

    const frames = Array.from(sp.querySelectorAll('.sp-page-frame'))
    expect(frames[0]!.querySelector('.sp-frame-footer')).not.toBeNull()
    expect(frames[1]!.querySelector('.sp-frame-footer')).toBeNull()
    expect(frames[2]!.querySelector('.sp-frame-footer')).not.toBeNull()
  })

  it('header clone does not retain control attributes', () => {
    const sp = makeStapledPages(`
      <stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px">
        <page-header height="48px" skip-first skip-pages="3"><span>H</span></page-header>
      </stapled-pages>
    `)
    ;(sp as unknown as { _headerTemplate: PageHeader | null })._headerTemplate =
      sp.querySelector('page-header') as PageHeader

    callBuildFrame(sp, 3)

    // Page 2 frame should have a header (skip-first only suppresses page 1)
    const clone = sp.querySelectorAll('.sp-page-frame')[1]!.querySelector('page-header')!
    expect(clone.hasAttribute('height')).toBe(false)
    expect(clone.hasAttribute('skip-first')).toBe(false)
    expect(clone.hasAttribute('skip-pages')).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sp:ready event — flow modes
// ─────────────────────────────────────────────────────────────────────────────

describe('sp:ready event — flow mode', () => {
  type FinaliseFlowFn = (
    wrapper: HTMLElement,
    pageW: number,
    pageH: number,
    gapH: number,
    slotH: number,
    headerH: number,
    footerH: number,
    isFlowBreaks: boolean,
  ) => void

  beforeEach(() => stubComputedStyle())

  function makeStapledPages(html: string): StapledPages {
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    return container.querySelector('stapled-pages') as StapledPages
  }

  function callFinalise(
    sp: StapledPages,
    wrapper: HTMLElement,
    opts: { isFlowBreaks?: boolean; wrapperHeight?: number } = {},
  ): void {
    const { isFlowBreaks = false, wrapperHeight = 1056 } = opts
    Object.defineProperty(wrapper, 'offsetHeight', { get: () => wrapperHeight, configurable: true })
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(
      { top: 0, bottom: wrapperHeight, height: wrapperHeight, left: 0, right: 0, width: 816, x: 0, y: 0, toJSON: () => ({}) }
    )
    ;(sp as unknown as { _finaliseFlow: FinaliseFlowFn })
      ._finaliseFlow(wrapper, 816, 1056, 32, 1088, 0, 0, isFlowBreaks)
  }

  it('dispatches sp:ready with mode="flow"', () => {
    const events: CustomEvent[] = []
    const sp = makeStapledPages(`<stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px"></stapled-pages>`)
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))

    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    callFinalise(sp, wrapper, { isFlowBreaks: false, wrapperHeight: 1056 })

    expect(events).toHaveLength(1)
    expect(events[0]!.detail.mode).toBe('flow')
    expect(events[0]!.detail.pageWidth).toBe(816)
    expect(events[0]!.detail.pageHeight).toBe(1056)
  })

  it('dispatches sp:ready with mode="flow-breaks" when isFlowBreaks=true', () => {
    const events: CustomEvent[] = []
    const sp = makeStapledPages(`<stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px"></stapled-pages>`)
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))

    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    callFinalise(sp, wrapper, { isFlowBreaks: true })

    expect(events[0]!.detail.mode).toBe('flow-breaks')
  })

  it('computes pageCount from wrapper height (ceil(height / slotH))', () => {
    const events: CustomEvent[] = []
    const sp = makeStapledPages(`<stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px"></stapled-pages>`)
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))

    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    // 2200 / 1088 = 2.02 → ceil = 3? No: ceil(2200/1088) = ceil(2.02) = 3
    // But slotH=1088, so 2 full pages = 2176, 3rd page starts at 2176
    // Actually Math.ceil(2200/1088) = 3
    callFinalise(sp, wrapper, { wrapperHeight: 2200 })

    expect(events[0]!.detail.pageCount).toBe(Math.ceil(2200 / 1088))
  })

  it('pageCount is at least 1 for an empty wrapper', () => {
    const events: CustomEvent[] = []
    const sp = makeStapledPages(`<stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px"></stapled-pages>`)
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))

    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    callFinalise(sp, wrapper, { wrapperHeight: 0 })

    expect(events[0]!.detail.pageCount).toBe(1)
  })

  it('event bubbles', () => {
    let fired = false
    const sp = makeStapledPages(`<stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px"></stapled-pages>`)
    document.body.addEventListener('sp:ready', () => { fired = true })

    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    callFinalise(sp, wrapper)

    expect(fired).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// _detectMode — auto-detect consistency
// ─────────────────────────────────────────────────────────────────────────────

describe('_detectMode — nested page-break detection', () => {
  type DetectModeFn = () => string

  function detectMode(html: string): string {
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-pages') as StapledPages
    return (sp as unknown as { _detectMode: DetectModeFn })._detectMode()
  }

  it('mode="flow" with a nested page-break returns flow-breaks', () => {
    const mode = detectMode(`
      <stapled-pages mode="flow">
        <div><page-break></page-break></div>
      </stapled-pages>
    `)
    expect(mode).toBe('flow-breaks')
  })

  it('auto-detect with a nested page-break returns flow-breaks', () => {
    const mode = detectMode(`
      <stapled-pages>
        <div><page-break></page-break></div>
      </stapled-pages>
    `)
    expect(mode).toBe('flow-breaks')
  })

  it('auto-detect with no page-break and no s-page returns pure flow', () => {
    const mode = detectMode(`<stapled-pages><p>Content</p></stapled-pages>`)
    expect(mode).toBe('flow')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// refresh() — flow mode
// ─────────────────────────────────────────────────────────────────────────────

describe('refresh() — flow mode', () => {
  beforeEach(() => {
    stubComputedStyle()
    // Make rAF synchronous so _finaliseFlow runs immediately without timer flushing
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0 })
    // Uniform layout stubs so getBoundingClientRect / offsetHeight don't crash
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      { top: 0, bottom: 0, height: 0, left: 0, right: 0, width: 816, x: 0, y: 0, toJSON: () => ({}) }
    )
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      get: () => 1056,
      configurable: true,
    })
  })

  it('has exactly one .sp-flow-wrapper and one .sp-frame-layer after refresh', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px">
        <page-header height="48px"><span>H</span></page-header>
        <p>Content</p>
      </stapled-pages>
    `
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-pages') as StapledPages

    ;(sp as unknown as { _build(): void })._build()

    sp.refresh()

    expect(sp.querySelectorAll('.sp-flow-wrapper').length).toBe(1)
    expect(sp.querySelectorAll('.sp-frame-layer').length).toBe(1)
  })

  it('re-stamps header content into the frame layer after refresh', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px">
        <page-header height="48px"><span class="hdr-content">H</span></page-header>
        <p>Content</p>
      </stapled-pages>
    `
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-pages') as StapledPages

    ;(sp as unknown as { _build(): void })._build()
    sp.refresh()

    expect(sp.querySelector('.sp-frame-layer .hdr-content')).not.toBeNull()
  })

  it('original content is preserved in the flow wrapper after refresh', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <stapled-pages mode="flow" page-width="816px" page-height="1056px" page-gap="32px">
        <p class="my-content">Hello</p>
      </stapled-pages>
    `
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-pages') as StapledPages

    ;(sp as unknown as { _build(): void })._build()
    sp.refresh()

    expect(sp.querySelector('.sp-flow-wrapper .my-content')).not.toBeNull()
  })
})
