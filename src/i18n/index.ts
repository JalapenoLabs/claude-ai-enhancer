// Core
import { createInstance } from 'i18next'

// Misc
import enUS from './locales/en-US.json'

// A private instance rather than the i18next singleton: the content script shares
// the page's window with claude.ai, and a dedicated instance cannot collide with it.
// Resources are bundled inline, so initialization is synchronous and `t` is ready on import.
export const i18n = createInstance()

void i18n.init({
  lng: 'en-US',
  fallbackLng: 'en-US',
  resources: {
    'en-US': { translation: enUS },
  },
  initAsync: false,
  interpolation: {
    // Output is Markdown or DOM textContent, never raw HTML, so escaping would only corrupt it.
    escapeValue: false,
  },
})

export const t = i18n.t.bind(i18n)
