import type { PageConversationLink } from './pageConversations'

// Core
import { selectionState } from './selectionState'
import { getVisibleConversationLinks, parseAnchor } from './pageConversations'
import { getShiftClickRange } from './rangeSelection'
import { createMirroredButton } from '../mirroredButton'

// Misc
import { t } from '../../i18n'
import { APP_SWITCH_SELECTOR, DOM_PREFIX, GHOST_ICON_BUTTON_SELECTOR } from '../../constants'

// content.css styles these, so their names must stay in step with it.
const SELECTING_ATTRIBUTE = `data-${DOM_PREFIX}-selecting`
const SELECTED_ATTRIBUTE = `data-${DOM_PREFIX}-selected`
const TOGGLE_CLASS = `${DOM_PREFIX}-select-toggle`

// Mouse pointer (Lucide "mouse-pointer-2", ISC license), sized like claude.ai's header icons.
const POINTER_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438
    1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
</svg>`

let hasWarnedMissingIconButton = false

/**
 * Selection mode turns clicks on conversation links into select/deselect instead of navigation.
 * It works on any conversation link on the page: the chat and Code sidebars, pinned items, and
 * conversation titles in the Recents table.
 */
export function installSelectionMode(): void {
  // Capture phase on `document` runs before React's listeners on its root element, so
  // stopping the event here prevents both claude.ai's handlers and the browser's navigation.
  document.addEventListener('click', onClickCapture, true)
  // Shift+mousedown would otherwise extend the page's text selection across the list.
  document.addEventListener('mousedown', (event) => {
    if (event.shiftKey && getSelectableLink(event)) {
      event.preventDefault()
    }
  }, true)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && selectionState.isActive) {
      selectionState.setActive(false)
    }
  })

  selectionState.subscribe(syncSelectionDom)
}

/**
 * Adds the multi-select toggle between the Claude logo and the Chat/Code switcher, and
 * re-applies selection marks to links React re-rendered. Safe to call on every DOM mutation.
 */
export function ensureSelectionDom(): void {
  const appSwitch = document.querySelector(APP_SWITCH_SELECTOR)
  if (appSwitch && !document.querySelector(`.${TOGGLE_CLASS}`)) {
    const iconButton = document.querySelector<HTMLButtonElement>(GHOST_ICON_BUTTON_SELECTOR)
    if (iconButton) {
      appSwitch.before(createToggle(iconButton))
    }
    else if (!hasWarnedMissingIconButton) {
      // Warned once: this runs on every DOM mutation.
      hasWarnedMissingIconButton = true
      console.warn('[claude-ai-enhancer] No icon button to mirror, not adding the multi-select toggle')
    }
  }

  syncSelectionDom()
}

function onClickCapture(event: MouseEvent) {
  // Links that are not conversations, or not a supported kind, keep working normally.
  const link = getSelectableLink(event)
  if (!link) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  if (event.shiftKey) {
    const links = getVisibleConversationLinks()
    const items = links.map((link) => link.conversation)
    const targetIndex = links.findIndex((candidate) => candidate.anchor === link.anchor)
    const range = getShiftClickRange(items, selectionState.rangeAnchorPathname, targetIndex)
    if (range) {
      selectionState.selectMany(range)
      return
    }

    console.debug('[claude-ai-enhancer] Shift-click without a range anchor on the page, toggling instead')
  }

  selectionState.toggle(link.conversation)
}

function getSelectableLink(event: MouseEvent): PageConversationLink | undefined {
  if (!selectionState.isActive || !(event.target instanceof Element)) {
    return undefined
  }

  const anchor = event.target.closest('a[href]')
  if (!(anchor instanceof HTMLAnchorElement)) {
    return undefined
  }

  const conversation = parseAnchor(anchor)
  if (!conversation) {
    return undefined
  }

  return { anchor, conversation }
}

function createToggle(iconButton: HTMLButtonElement): HTMLButtonElement {
  const { button, content } = createMirroredButton(iconButton)
  button.classList.add(TOGGLE_CLASS)
  content.innerHTML = POINTER_ICON
  button.addEventListener('click', () => {
    selectionState.setActive(!selectionState.isActive)
  })

  return button
}

// Only writes when something differs: every write is a DOM mutation, which re-triggers the observer.
function syncSelectionDom() {
  const { isActive } = selectionState

  if (document.documentElement.hasAttribute(SELECTING_ATTRIBUTE) !== isActive) {
    document.documentElement.toggleAttribute(SELECTING_ATTRIBUTE, isActive)
  }

  // The label doubles as the tooltip text (content.css renders it from aria-label).
  const toggleLabel = isActive
    ? t('selection.exitToggle')
    : t('selection.enterToggle')
  for (const toggle of document.querySelectorAll(`.${TOGGLE_CLASS}`)) {
    if (toggle.getAttribute('aria-label') !== toggleLabel) {
      toggle.setAttribute('aria-label', toggleLabel)
      toggle.setAttribute('aria-pressed', String(isActive))
    }
  }

  for (const anchor of document.querySelectorAll(`a[${SELECTED_ATTRIBUTE}]`)) {
    if (!selectionState.has(anchor.getAttribute('href') ?? '')) {
      anchor.removeAttribute(SELECTED_ATTRIBUTE)
    }
  }

  for (const conversation of selectionState.items) {
    for (const anchor of document.querySelectorAll(`a[href="${CSS.escape(conversation.pathname)}"]`)) {
      if (!anchor.hasAttribute(SELECTED_ATTRIBUTE)) {
        anchor.setAttribute(SELECTED_ATTRIBUTE, '')
      }
    }
  }
}
