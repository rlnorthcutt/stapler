import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { measureHeight } from '../src/utils/measureHeight.js'

describe('measureHeight', () => {
  beforeEach(() => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      { fontSize: '16px' } as CSSStyleDeclaration
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  describe('with height attribute', () => {
    it('returns parsed px value directly without DOM manipulation', () => {
      const el = document.createElement('page-header')
      el.setAttribute('height', '48px')

      const appendSpy = vi.spyOn(document.body, 'appendChild')
      const result = measureHeight(el, 816)

      expect(result).toBe(48)
      expect(appendSpy).not.toHaveBeenCalled()
    })

    it('converts inch attribute', () => {
      const el = document.createElement('page-header')
      el.setAttribute('height', '0.5in')

      expect(measureHeight(el, 816)).toBe(48)
    })

    it('converts rem attribute', () => {
      const el = document.createElement('page-header')
      el.setAttribute('height', '3rem')

      expect(measureHeight(el, 816)).toBe(48)
    })
  })

  describe('without height attribute — off-screen measurement', () => {
    it('appends a container to body and removes it', () => {
      const el = document.createElement('page-header')
      el.innerHTML = '<div>Header</div>'

      // happy-dom returns 0 for offsetHeight; just verify the DOM lifecycle
      const initialChildCount = document.body.children.length
      measureHeight(el, 816)
      expect(document.body.children.length).toBe(initialChildCount)
    })

    it('container has correct width and is hidden', () => {
      const el = document.createElement('page-header')
      el.innerHTML = '<div>Header</div>'

      let capturedContainer: HTMLElement | null = null
      const orig = document.body.appendChild.bind(document.body)
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        capturedContainer = node as HTMLElement
        return orig(node)
      })

      measureHeight(el, 816)

      expect(capturedContainer).not.toBeNull()
      // happy-dom serialises cssText with spaces; check via .style properties
      const s = (capturedContainer as unknown as HTMLElement).style
      expect(s.width).toBe('816px')
      expect(s.visibility).toBe('hidden')
      expect(s.position).toBe('fixed')
    })

    it('strips control attributes from clone', () => {
      const el = document.createElement('page-header')
      el.setAttribute('skip-first', '')
      el.setAttribute('skip-pages', '1,3')
      el.innerHTML = '<span>Header</span>'

      let capturedContainer: HTMLElement | null = null
      const orig = document.body.appendChild.bind(document.body)
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        capturedContainer = node as HTMLElement
        return orig(node)
      })

      measureHeight(el, 816)

      const clone = capturedContainer!.firstElementChild!
      expect(clone.hasAttribute('skip-first')).toBe(false)
      expect(clone.hasAttribute('skip-pages')).toBe(false)
    })
  })
})
