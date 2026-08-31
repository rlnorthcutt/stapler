/**
 * Resolves once the document has finished its initial parse — either it's
 * already past the "loading" state, or DOMContentLoaded fires. Unlike a
 * single requestAnimationFrame, this holds through slow/chunked parsing of
 * the initial HTML, where the browser can yield between chunks.
 */
export function domReady(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState !== 'loading') {
      resolve()
    } else {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
    }
  })
}

/**
 * Returns a Promise that resolves once:
 *   1. The DOM is ready (DOMContentLoaded or already interactive/complete)
 *   2. All fonts are loaded (document.fonts.ready)
 *   3. All <img> descendants have decoded (img.decode())
 *
 * This ensures height measurements after this fence are stable.
 */
export function waitForAssets(root: Element | ShadowRoot): Promise<void> {
  const domReadyPromise = domReady()

  // document.fonts may be absent in non-browser environments (e.g. test runners)
  const fontsReady = document.fonts?.ready
    ? document.fonts.ready.then(() => undefined)
    : Promise.resolve()

  const imagesReady = domReadyPromise.then(() => {
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

  return Promise.all([domReadyPromise, fontsReady, imagesReady]).then(() => undefined)
}
