// Core
import { ensureExportButton } from './exportButton'
import { installActionBar } from './selection/actionBar'
import { ensureSelectionDom, installSelectionMode } from './selection/selectionMode'

// claude.ai renders its UI after load and re-renders it on every in-app navigation, so the
// extension's additions are (re)attached whenever the DOM changes. Checks are batched to one
// per animation frame, since React can emit hundreds of mutations in a single render.
let isCheckScheduled = false

function ensureInjectedUi() {
  ensureExportButton()
  ensureSelectionDom()
}

const observer = new MutationObserver(() => {
  if (isCheckScheduled) {
    return
  }

  isCheckScheduled = true
  requestAnimationFrame(() => {
    isCheckScheduled = false
    ensureInjectedUi()
  })
})

installSelectionMode()
installActionBar()
observer.observe(document.body, { childList: true, subtree: true })
ensureInjectedUi()
