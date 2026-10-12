// Core
import { createMirroredButton } from './mirroredButton'
import { exportConversation } from '../export/exportConversation'

// Misc
import { t } from '../i18n'
import {
  ACTIONS_GROUP_SELECTOR,
  CHAT_PATH_PATTERN,
  EXPORT_BUTTON_TEST_ID,
  EXPORT_FAILURE_DISPLAY_MS,
  SHARE_BUTTON_SELECTOR,
} from '../constants'

// Download arrow, sized and stroked to sit beside claude.ai's own toolbar icons.
const DOWNLOAD_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
</svg>`

/**
 * Places an Export button immediately left of claude.ai's Share button. Safe to call on
 * every DOM mutation: it does nothing when the Share button is absent or Export already exists.
 */
export function ensureExportButton(): void {
  const shareButton = document.querySelector<HTMLButtonElement>(SHARE_BUTTON_SELECTOR)
  if (!shareButton) {
    return
  }

  // Share is wrapped in a few spans; the Export button becomes a sibling of the outermost one.
  const shareSlot = shareButton.closest(`${ACTIONS_GROUP_SELECTOR} > *`)
  if (!shareSlot?.parentElement) {
    console.warn('[claude-ai-enhancer] Share button found outside its actions group, not adding Export')
    return
  }

  if (shareSlot.parentElement.querySelector(`[data-testid="${EXPORT_BUTTON_TEST_ID}"]`)) {
    return
  }

  shareSlot.before(createExportButton(shareButton))
  console.debug('[claude-ai-enhancer] Export button added')
}

function createExportButton(shareButton: HTMLButtonElement): HTMLButtonElement {
  const { button, content } = createMirroredButton(shareButton)
  button.dataset.testid = EXPORT_BUTTON_TEST_ID
  button.title = t('exportButton.tooltip')
  content.innerHTML = DOWNLOAD_ICON

  const label = document.createElement('span')
  label.textContent = t('exportButton.label')
  content.append(label)

  button.addEventListener('click', async () => {
    // Read at click time: claude.ai is a single-page app and reuses this toolbar across chats.
    const conversationId = CHAT_PATH_PATTERN.exec(location.pathname)?.[1]
    if (!conversationId) {
      console.warn('[claude-ai-enhancer] Export clicked outside a chat page', location.pathname)
      return
    }

    button.disabled = true
    button.setAttribute('aria-busy', 'true')
    label.textContent = t('exportButton.exporting')

    try {
      await exportConversation(conversationId)
      label.textContent = t('exportButton.label')
    }
    catch (error) {
      console.error('[claude-ai-enhancer] Export failed', error)
      label.textContent = t('exportButton.failed')
      setTimeout(() => {
        label.textContent = t('exportButton.label')
      }, EXPORT_FAILURE_DISPLAY_MS)
    }
    finally {
      button.disabled = false
      button.removeAttribute('aria-busy')
    }
  })

  return button
}
