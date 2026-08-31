import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { Stapler } from '../src/components/StapledPages.js'
import { PageHeader } from '../src/components/PageHeader.js'
import { PageFooter } from '../src/components/PageFooter.js'
import { SPage } from '../src/components/SPage.js'
import { SPageBody } from '../src/components/SPageBody.js'
import { PageNumber } from '../src/components/PageNumber.js'

beforeAll(() => {
  if (!customElements.get('stapled-doc')) customElements.define('stapled-doc', Stapler)
  if (!customElements.get('page-header'))   customElements.define('page-header', PageHeader)
  if (!customElements.get('page-footer'))   customElements.define('page-footer', PageFooter)
  if (!customElements.get('s-page'))        customElements.define('s-page', SPage)
  if (!customElements.get('s-page-body'))   customElements.define('s-page-body', SPageBody)
  if (!customElements.get('page-number'))   customElements.define('page-number', PageNumber)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

/**
 * Simulates the real HTML parser: <stapled-doc> is created and connected to
 * the document with zero children (connectedCallback fires here), and only
 * afterward does a child get appended. Using innerHTML instead would build
 * the whole subtree before ever connecting it, which masks this bug.
 */
function createParserStyleEmbedDoc(): Stapler {
  const doc = document.createElement('stapled-doc') as Stapler
  doc.setAttribute('embed', '')
  doc.setAttribute('page-width', '816px')
  doc.setAttribute('page-height', '1056px')
  document.body.appendChild(doc)

  const page = document.createElement('s-page')
  page.innerHTML = '<p>A</p>'
  doc.appendChild(page)

  return doc
}

describe('Embed mode — HTML-parser timing', () => {
  it('moves children into the shadow root even when they are appended after connectedCallback fires', async () => {
    const rafCallbacks: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })

    const doc = createParserStyleEmbedDoc()

    expect(doc.shadowRoot).not.toBeNull()

    // Let waitForAssets settle — its resolution moves the children into the
    // shadow root, then queues the frame that runs _build().
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(doc.childNodes.length).toBe(0)
    const shadowPage = doc.shadowRoot!.querySelector('s-page')
    expect(shadowPage).not.toBeNull()
    expect(shadowPage!.querySelector('p')?.textContent).toBe('A')

    // Flush the frame that runs _build().
    rafCallbacks.shift()?.(0)

    expect((shadowPage as HTMLElement).style.width).toBe('816px')
    expect((shadowPage as HTMLElement).style.height).toBe('1056px')
  })

  it('refresh() called before content has moved into the shadow root is a no-op, not a bogus 0-page build', async () => {
    const rafCallbacks: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })

    const doc = createParserStyleEmbedDoc()
    const events: CustomEvent[] = []
    doc.addEventListener('sp:ready', (e) => events.push(e as CustomEvent))

    // Call refresh() synchronously — before waitForAssets has resolved and
    // moved the parser-appended children into the shadow root.
    doc.refresh()
    expect(events).toHaveLength(0)

    // The deferred initial build should still land correctly afterward.
    await new Promise((resolve) => setTimeout(resolve, 0))
    rafCallbacks.shift()?.(0)

    expect(events).toHaveLength(1)
    expect(events[0]!.detail.pageCount).toBe(1)
  })
})
