/**
 * Returns a Promise that resolves once:
 *   1. The DOM is ready (DOMContentLoaded or already interactive/complete)
 *   2. All fonts are loaded (document.fonts.ready)
 *   3. All <img> descendants have decoded (img.decode())
 *
 * This ensures height measurements after this fence are stable.
 */
export function waitForAssets(root: Element | ShadowRoot): Promise<void> {
  const domReady = new Promise<void>((resolve) => {
    if (document.readyState !== 'loading') {
      resolve()
    } else {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
    }
  })

  // document.fonts may be absent in non-browser environments (e.g. test runners)
  const fontsReady = document.fonts?.ready
    ? document.fonts.ready.then(() => undefined)
    : Promise.resolve()

  const imagesReady = domReady.then(() => {
    const imgs = Array.from(root.querySelectorAll('img'))
    return Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : img.decode().catch(() => {
              // decode() rejects for broken images — treat as loaded
            })
      )
    ).then(() => undefined)
  })

  return Promise.all([domReady, fontsReady, imagesReady]).then(() => undefined)
}
