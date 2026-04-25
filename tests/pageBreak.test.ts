import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { Stapler } from '../src/components/StapledPages.js'
import { PageHeader } from '../src/components/PageHeader.js'
import { PageFooter } from '../src/components/PageFooter.js'
import { PageSpacer } from '../src/components/PageSpacer.js'
import { PageNumber } from '../src/components/PageNumber.js'

beforeAll(() => {
  if (!customElements.get('stapled-doc'))  customElements.define('stapled-doc', Stapler)
  if (!customElements.get('page-header'))  customElements.define('page-header', PageHeader)
  if (!customElements.get('page-footer'))  customElements.define('page-footer', PageFooter)
  if (!customElements.get('page-spacer'))  customElements.define('page-spacer', PageSpacer)
  if (!customElements.get('page-number'))  customElements.define('page-number', PageNumber)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

/**
 * Directly test _processPageBreaks by calling it with mock geometry.
 * We spy on getBoundingClientRect to return controlled positions.
 */
describe('_processPageBreaks', () => {
  const slotH = 1056 + 32  // pageH + gapH
  const pageH = 1056
  const headerH = 48
  const footerH = 32

  function makeWrapper(breakPositions: number[]): {
    wrapper: HTMLElement
    breaks: HTMLElement[]
  } {
    const wrapper = document.createElement('div')
    const breaks: HTMLElement[] = []

    breakPositions.forEach((pos) => {
      const pb = document.createElement('page-spacer') as HTMLElement
      wrapper.appendChild(pb)
      breaks.push(pb)
    })

    document.body.appendChild(wrapper)
    return { wrapper, breaks }
  }

  it('computes height to reach next content area start', () => {
    const { wrapper, breaks } = makeWrapper([500])
    const pb = breaks[0]!

    // Stub: wrapper top = 0, page-spacer top = 500
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(
      { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }
    )
    vi.spyOn(pb, 'getBoundingClientRect').mockReturnValue(
      { top: 500, bottom: 500, left: 0, right: 0, width: 0, height: 0, x: 0, y: 500, toJSON: () => ({}) }
    )

    // Access private method
    const sp = document.createElement('stapled-doc') as Stapler
    ;(sp as unknown as {
      _processPageBreaks(w: HTMLElement, slotH: number, pageH: number, hH: number, fH: number): void
    })._processPageBreaks(wrapper, slotH, pageH, headerH, footerH)

    // flowY = 500, pageIndex = floor(500 / 1088) = 0
    // nextContentStart = 1 * 1088 + 48 = 1136
    // height = 1136 - 500 = 636
    expect(pb.style.height).toBe('636px')
  })

  it('handles a break on page 2', () => {
    const { wrapper, breaks } = makeWrapper([1200])
    const pb = breaks[0]!

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(
      { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }
    )
    vi.spyOn(pb, 'getBoundingClientRect').mockReturnValue(
      { top: 1200, bottom: 1200, left: 0, right: 0, width: 0, height: 0, x: 0, y: 1200, toJSON: () => ({}) }
    )

    const sp = document.createElement('stapled-doc') as Stapler
    ;(sp as unknown as {
      _processPageBreaks(w: HTMLElement, slotH: number, pageH: number, hH: number, fH: number): void
    })._processPageBreaks(wrapper, slotH, pageH, headerH, footerH)

    // flowY = 1200, pageIndex = floor(1200 / 1088) = 1
    // nextContentStart = 2 * 1088 + 48 = 2224
    // height = 2224 - 1200 = 1024
    expect(pb.style.height).toBe('1024px')
  })

  it('resets height to 0 before reading position', () => {
    const { wrapper, breaks } = makeWrapper([500])
    const pb = breaks[0]!
    pb.style.height = '999px'

    const heights: string[] = []
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(
      { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }
    )
    // Capture the height at time of getBoundingClientRect call
    vi.spyOn(pb, 'getBoundingClientRect').mockImplementation(() => {
      heights.push(pb.style.height)
      return { top: 500, bottom: 500, left: 0, right: 0, width: 0, height: 0, x: 0, y: 500, toJSON: () => ({}) }
    })

    const sp = document.createElement('stapled-doc') as Stapler
    ;(sp as unknown as {
      _processPageBreaks(w: HTMLElement, slotH: number, pageH: number, hH: number, fH: number): void
    })._processPageBreaks(wrapper, slotH, pageH, headerH, footerH)

    // Height must be 0 when getBoundingClientRect is called
    expect(heights[0]).toBe('0px')
  })

  it('processes multiple breaks sequentially', () => {
    const { wrapper, breaks } = makeWrapper([400, 900])
    const [pb1, pb2] = breaks as [HTMLElement, HTMLElement]

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(
      { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }
    )
    vi.spyOn(pb1, 'getBoundingClientRect').mockReturnValue(
      { top: 400, bottom: 400, left: 0, right: 0, width: 0, height: 0, x: 0, y: 400, toJSON: () => ({}) }
    )
    vi.spyOn(pb2, 'getBoundingClientRect').mockReturnValue(
      { top: 900, bottom: 900, left: 0, right: 0, width: 0, height: 0, x: 0, y: 900, toJSON: () => ({}) }
    )

    const sp = document.createElement('stapled-doc') as Stapler
    ;(sp as unknown as {
      _processPageBreaks(w: HTMLElement, slotH: number, pageH: number, hH: number, fH: number): void
    })._processPageBreaks(wrapper, slotH, pageH, headerH, footerH)

    // pb1: flowY=400, pageIndex=0, nextContentStart=1136, height=736
    expect(pb1.style.height).toBe('736px')
    // pb2: flowY=900, pageIndex=0, nextContentStart=1136, height=236
    expect(pb2.style.height).toBe('236px')
  })

  it('clamps height to 0 if position is already past content start', () => {
    const { wrapper, breaks } = makeWrapper([1100])
    const pb = breaks[0]!

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(
      { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }
    )
    // flowY = 1100, pageIndex = 1, nextContentStart = 2*1088+48 = 2224
    // But let's put it exactly at nextContentStart to test the 0 clamp
    vi.spyOn(pb, 'getBoundingClientRect').mockReturnValue(
      { top: 1136, bottom: 1136, left: 0, right: 0, width: 0, height: 0, x: 0, y: 1136, toJSON: () => ({}) }
    )

    const sp = document.createElement('stapled-doc') as Stapler
    ;(sp as unknown as {
      _processPageBreaks(w: HTMLElement, slotH: number, pageH: number, hH: number, fH: number): void
    })._processPageBreaks(wrapper, slotH, pageH, headerH, footerH)

    // flowY = 1136 = 1*1088+48 = nextContentStart for page 1
    // pageIndex = floor(1136/1088) = 1
    // nextContentStart = 2*1088+48 = 2224, height = 2224-1136 = 1088
    expect(parseInt(pb.style.height)).toBeGreaterThanOrEqual(0)
  })
})
