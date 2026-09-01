import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { Stapler } from '../src/components/StapledPages.js'
import { DEFAULT_TEMPLATE_HEIGHT_PX } from '../src/utils/measureHeight.js'
import { PageHeader } from '../src/components/PageHeader.js'
import { PageFooter } from '../src/components/PageFooter.js'
import { SPage } from '../src/components/SPage.js'
import { SPageBody } from '../src/components/SPageBody.js'
import { PageNumber } from '../src/components/PageNumber.js'

beforeAll(() => {
  if (!customElements.get('stapled-doc'))  customElements.define('stapled-doc', Stapler)
  if (!customElements.get('page-header'))  customElements.define('page-header', PageHeader)
  if (!customElements.get('page-footer'))  customElements.define('page-footer', PageFooter)
  if (!customElements.get('s-page'))       customElements.define('s-page', SPage)
  if (!customElements.get('s-page-body'))  customElements.define('s-page-body', SPageBody)
  if (!customElements.get('page-number'))  customElements.define('page-number', PageNumber)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  document.head.querySelectorAll('style').forEach((s) => s.remove())
})

function build(html: string): Stapler {
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  const sp = container.querySelector('stapled-doc') as Stapler
  ;(sp as unknown as { _build(): void })._build()
  return sp
}

// ── Required attributes ───────────────────────────────────────────────────────

describe('required page-width attribute', () => {
  it('logs console.error and does not dispatch sp:ready when page-width is missing', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const events: CustomEvent[] = []
    const container = document.createElement('div')
    container.innerHTML = `<stapled-doc page-height="1056px"><s-page><p>A</p></s-page></stapled-doc>`
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-doc') as Stapler
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))
    ;(sp as unknown as { _build(): void })._build()

    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('page-width'))
    expect(events).toHaveLength(0)
  })
})

describe('required page-height attribute', () => {
  it('logs console.error and does not dispatch sp:ready when page-height is missing', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const events: CustomEvent[] = []
    const container = document.createElement('div')
    container.innerHTML = `<stapled-doc page-width="816px"><s-page><p>A</p></s-page></stapled-doc>`
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-doc') as Stapler
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))
    ;(sp as unknown as { _build(): void })._build()

    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('page-height'))
    expect(events).toHaveLength(0)
  })
})

describe('mode="flow" deprecation', () => {
  it('logs console.error with migration message and does not build', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const events: CustomEvent[] = []
    const container = document.createElement('div')
    container.innerHTML = `
      <stapled-doc mode="flow" page-width="816px" page-height="1056px">
        <p>Content</p>
      </stapled-doc>
    `
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-doc') as Stapler
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))
    ;(sp as unknown as { _build(): void })._build()

    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('flow'))
    expect(events).toHaveLength(0)
  })
})

describe('required height attribute', () => {
  it('logs console.error and falls back to the default height when page-header has no height', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const events: CustomEvent[] = []
    const container = document.createElement('div')
    container.innerHTML = `
      <stapled-doc page-width="816px" page-height="1056px" page-gap="0px">
        <page-header><span>H</span></page-header>
        <s-page><p>A</p></s-page>
      </stapled-doc>
    `
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-doc') as Stapler
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))
    ;(sp as unknown as { _build(): void })._build()

    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('height'))
    expect(events).toHaveLength(1)
    const header = sp.querySelector('page-header') as HTMLElement
    expect(header.style.height).toBe(`${DEFAULT_TEMPLATE_HEIGHT_PX}px`)
  })

  it('logs console.error and falls back to the default height when page-footer has no height', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const events: CustomEvent[] = []
    const container = document.createElement('div')
    container.innerHTML = `
      <stapled-doc page-width="816px" page-height="1056px" page-gap="0px">
        <page-footer><span>F</span></page-footer>
        <s-page><p>A</p></s-page>
      </stapled-doc>
    `
    document.body.appendChild(container)
    const sp = container.querySelector('stapled-doc') as Stapler
    sp.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))
    ;(sp as unknown as { _build(): void })._build()

    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('height'))
    expect(events).toHaveLength(1)
    const footer = sp.querySelector('page-footer') as HTMLElement
    expect(footer.style.height).toBe(`${DEFAULT_TEMPLATE_HEIGHT_PX}px`)
  })
})

// ── @page rule emission ───────────────────────────────────────────────────────

describe('@page rule injection', () => {
  it('injects a <style> with @page rule into document.head after build', () => {
    build(`
      <stapled-doc page-width="816px" page-height="1056px" page-gap="0px">
        <s-page><p>A</p></s-page>
      </stapled-doc>
    `)
    const styles = Array.from(document.head.querySelectorAll('style'))
    const pageRule = styles.find((s) => s.textContent?.includes('@page'))
    expect(pageRule).not.toBeUndefined()
    expect(pageRule!.textContent).toContain('816px')
    expect(pageRule!.textContent).toContain('1056px')
    expect(pageRule!.textContent).toContain('margin: 0')
  })

  it('replaces the @page rule on refresh() without accumulating rules', () => {
    const sp = build(`
      <stapled-doc page-width="816px" page-height="1056px" page-gap="0px">
        <s-page><p>A</p></s-page>
      </stapled-doc>
    `)
    sp.refresh()
    sp.refresh()

    const styles = Array.from(document.head.querySelectorAll('style'))
    const pageRules = styles.filter((s) => s.textContent?.includes('@page'))
    expect(pageRules).toHaveLength(1)
  })
})

// ── preview="print" ───────────────────────────────────────────────────────────

describe('preview="print" attribute', () => {
  it('sets --sp-page-gap to 0px when preview="print"', () => {
    const sp = build(`
      <stapled-doc page-width="816px" page-height="1056px"
                   page-gap="32px" preview="print">
        <s-page><p>A</p></s-page>
      </stapled-doc>
    `)
    expect(sp.style.getPropertyValue('--sp-page-gap')).toBe('0px')
  })

  it('uses normal page-gap when preview is not set', () => {
    const sp = build(`
      <stapled-doc page-width="816px" page-height="1056px" page-gap="32px">
        <s-page><p>A</p></s-page>
      </stapled-doc>
    `)
    expect(sp.style.getPropertyValue('--sp-page-gap')).toBe('32px')
  })
})
