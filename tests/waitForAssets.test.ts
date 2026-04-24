import { describe, it, expect, vi, afterEach } from 'vitest'
import { waitForAssets } from '../src/utils/waitForAssets.js'

describe('waitForAssets', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('resolves when DOM is ready and no images present', async () => {
    const root = document.createElement('div')
    await expect(waitForAssets(root)).resolves.toBeUndefined()
  })

  it('resolves when all images are already complete', async () => {
    const root = document.createElement('div')
    const img = document.createElement('img')
    img.src = 'test.png'
    // happy-dom: img.complete is false by default; mock it
    Object.defineProperty(img, 'complete', { get: () => true })
    root.appendChild(img)

    await expect(waitForAssets(root)).resolves.toBeUndefined()
  })

  it('calls decode() on incomplete images', async () => {
    const root = document.createElement('div')
    const img = document.createElement('img')
    Object.defineProperty(img, 'complete', { get: () => false })
    const decodeSpy = vi.spyOn(img, 'decode').mockResolvedValue(undefined)
    root.appendChild(img)

    await waitForAssets(root)
    expect(decodeSpy).toHaveBeenCalledOnce()
  })

  it('resolves even if decode() rejects (broken image)', async () => {
    const root = document.createElement('div')
    const img = document.createElement('img')
    Object.defineProperty(img, 'complete', { get: () => false })
    vi.spyOn(img, 'decode').mockRejectedValue(new Error('broken'))
    root.appendChild(img)

    await expect(waitForAssets(root)).resolves.toBeUndefined()
  })

  it('handles multiple images, all resolve', async () => {
    const root = document.createElement('div')
    const imgs = [1, 2, 3].map(() => {
      const img = document.createElement('img')
      Object.defineProperty(img, 'complete', { get: () => false })
      vi.spyOn(img, 'decode').mockResolvedValue(undefined)
      root.appendChild(img)
      return img
    })

    await waitForAssets(root)
    imgs.forEach((img) => expect(img.decode).toHaveBeenCalledOnce())
  })
})
