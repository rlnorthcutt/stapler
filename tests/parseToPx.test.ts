import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseToPx } from '../src/utils/parseToPx.js'

describe('parseToPx', () => {
  beforeEach(() => {
    // Set root font size to 16px (browser default)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const style = { fontSize: '16px' } as CSSStyleDeclaration
      return style
    })
  })

  describe('absolute units', () => {
    it('converts px passthrough', () => {
      expect(parseToPx('96px')).toBe(96)
    })

    it('converts inches', () => {
      expect(parseToPx('1in')).toBe(96)
      expect(parseToPx('8.5in')).toBeCloseTo(816)
      expect(parseToPx('11in')).toBeCloseTo(1056)
    })

    it('converts cm', () => {
      expect(parseToPx('1cm')).toBeCloseTo(37.795, 2)
    })

    it('converts mm', () => {
      expect(parseToPx('10mm')).toBeCloseTo(37.795, 2)
    })

    it('converts pt', () => {
      expect(parseToPx('72pt')).toBeCloseTo(96)
    })
  })

  describe('relative units', () => {
    it('converts rem using root font size', () => {
      expect(parseToPx('1rem')).toBe(16)
      expect(parseToPx('2rem')).toBe(32)
    })

    it('converts em using element font size', () => {
      const el = document.createElement('div')
      expect(parseToPx('1em', el)).toBe(16)
      expect(parseToPx('1.5em', el)).toBe(24)
    })
  })

  describe('whitespace handling', () => {
    it('trims leading and trailing whitespace', () => {
      expect(parseToPx('  96px  ')).toBe(96)
    })

    it('handles space between number and unit', () => {
      expect(parseToPx('1 in')).toBe(96)
    })
  })

  describe('decimal values', () => {
    it('handles decimal numbers', () => {
      expect(parseToPx('0.5in')).toBeCloseTo(48)
    })
  })

  describe('error cases', () => {
    it('throws on unrecognized unit', () => {
      expect(() => parseToPx('100vh')).toThrow('unsupported CSS unit')
    })

    it('throws on completely invalid input', () => {
      expect(() => parseToPx('auto')).toThrow('cannot parse CSS length')
    })

    it('throws on empty string', () => {
      expect(() => parseToPx('')).toThrow('cannot parse CSS length')
    })
  })
})
