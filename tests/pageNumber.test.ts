import { describe, it, expect, beforeAll } from 'vitest'
import { PageNumber } from '../src/components/PageNumber.js'

beforeAll(() => {
  if (!customElements.get('page-number')) {
    customElements.define('page-number', PageNumber)
  }
})

describe('PageNumber', () => {
  describe('resolve()', () => {
    function makePN(format?: string): PageNumber {
      const el = document.createElement('page-number') as PageNumber
      if (format) el.setAttribute('format', format)
      return el
    }

    it('defaults to "n" format', () => {
      const pn = makePN()
      pn.resolve(3, 8)
      expect(pn.textContent).toBe('3')
    })

    it('n format renders page number', () => {
      const pn = makePN('n')
      pn.resolve(5, 10)
      expect(pn.textContent).toBe('5')
    })

    it('n/total format', () => {
      const pn = makePN('n/total')
      pn.resolve(3, 8)
      expect(pn.textContent).toBe('3 / 8')
    })

    it('n of total format', () => {
      const pn = makePN('n of total')
      pn.resolve(3, 8)
      expect(pn.textContent).toBe('3 of 8')
    })

    it('total format renders only total', () => {
      const pn = makePN('total')
      pn.resolve(3, 8)
      expect(pn.textContent).toBe('8')
    })

    it('unknown format falls back to page number', () => {
      const pn = makePN('roman')
      pn.resolve(3, 8)
      expect(pn.textContent).toBe('3')
    })

    it('resolves page 1 of 1', () => {
      const pn = makePN('n/total')
      pn.resolve(1, 1)
      expect(pn.textContent).toBe('1 / 1')
    })
  })
})
