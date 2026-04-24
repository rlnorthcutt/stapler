import { CORE_CSS } from './css.js'
import { StapledPages } from './components/StapledPages.js'
import { PageHeader } from './components/PageHeader.js'
import { PageFooter } from './components/PageFooter.js'
import { SPage } from './components/SPage.js'
import { PageBreak } from './components/PageBreak.js'
import { PageNumber } from './components/PageNumber.js'

// Inject structural CSS once — guard prevents double-injection
if (!document.getElementById('sp-core-styles')) {
  const style = document.createElement('style')
  style.id = 'sp-core-styles'
  style.textContent = CORE_CSS
  document.head.appendChild(style)
}

// Register all custom elements
customElements.define(StapledPages.TAG, StapledPages)
customElements.define(PageHeader.TAG, PageHeader)
customElements.define(PageFooter.TAG, PageFooter)
customElements.define(SPage.TAG, SPage)
customElements.define(PageBreak.TAG, PageBreak)
customElements.define(PageNumber.TAG, PageNumber)
