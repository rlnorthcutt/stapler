import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { measureHeight, DEFAULT_TEMPLATE_HEIGHT_PX } from '../src/utils/measureHeight.js'

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

  it('returns parsed px value directly', () => {
    const el = document.createElement('page-header')
    el.setAttribute('height', '48px')

    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const result = measureHeight(el)

    expect(result).toBe(48)
    expect(appendSpy).not.toHaveBeenCalled()
  })

  it('converts inch attribute', () => {
    const el = document.createElement('page-header')
    el.setAttribute('height', '0.5in')
    expect(measureHeight(el)).toBe(48)
  })

  it('converts rem attribute', () => {
    const el = document.createElement('page-header')
    el.setAttribute('height', '3rem')
    expect(measureHeight(el)).toBe(48)
  })

  it('falls back to the default height when height attribute is absent', () => {
    const el = document.createElement('page-header')
    expect(measureHeight(el)).toBe(DEFAULT_TEMPLATE_HEIGHT_PX)
  })
})
