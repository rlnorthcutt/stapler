import { CORE_CSS } from './css.js'
import { Stapler } from './components/StapledPages.js'
import { PageHeader } from './components/PageHeader.js'
import { PageFooter } from './components/PageFooter.js'
import { SPage } from './components/SPage.js'
import { PageSpacer } from './components/PageSpacer.js'
import { PageNumber } from './components/PageNumber.js'

// Inject structural CSS once — guard prevents double-injection
if (!document.getElementById('sp-core-styles')) {
  const style = document.createElement('style')
  style.id = 'sp-core-styles'
  style.textContent = CORE_CSS
  document.head.appendChild(style)
}

// Register all custom elements
customElements.define(Stapler.TAG, Stapler)
customElements.define(PageHeader.TAG, PageHeader)
customElements.define(PageFooter.TAG, PageFooter)
customElements.define(SPage.TAG, SPage)
customElements.define(PageSpacer.TAG, PageSpacer)
customElements.define(PageNumber.TAG, PageNumber)
