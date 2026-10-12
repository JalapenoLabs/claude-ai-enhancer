import type { BulkAction } from '../../bulk/types'

// Core
import { getVisibleConversationLinks } from './pageConversations'
import { selectionState } from './selectionState'
import { runConversationAction } from '../../bulk/conversationKinds'
import { runBatch } from '../../bulk/runBatch'

// Misc
import { t } from '../../i18n'
import { BULK_ACTION_CONCURRENCY, DOM_PREFIX } from '../../constants'

type BarPhase =
  | { name: 'choosing' }
  | { name: 'confirming', action: BulkAction }
  | { name: 'running', action: BulkAction }
  | { name: 'reporting', succeededCount: number, failedCount: number }

const confirmKeyByAction = {
  archive: 'selection.confirmArchive',
  remove: 'selection.confirmDelete',
} as const satisfies Record<BulkAction, string>

const runningKeyByAction = {
  archive: 'selection.archiving',
  remove: 'selection.deleting',
} as const satisfies Record<BulkAction, string>

const bar = document.createElement('div')
bar.className = `${DOM_PREFIX}-action-bar`
bar.setAttribute('role', 'toolbar')

let phase: BarPhase = { name: 'choosing' }

/**
 * A floating bar, shown while selection mode is on, that runs Archive or Delete over the
 * selection. Every action asks for confirmation first: deletes are permanent, and archived
 * chats vanish from claude.ai's lists.
 */
export function installActionBar(): void {
  document.body.append(bar)
  selectionState.subscribe(() => {
    if (!selectionState.isActive) {
      phase = { name: 'choosing' }
    }
    render()
  })
  render()
}

function render() {
  bar.hidden = !selectionState.isActive
  if (bar.hidden) {
    return
  }

  const count = selectionState.items.length
  const message = document.createElement('span')
  message.className = `${DOM_PREFIX}-action-bar-message`

  if (phase.name === 'choosing') {
    // With nothing selected the bar shows only its buttons; there is no count worth stating.
    message.textContent = t('selection.count', { count })
    message.hidden = !count
    bar.replaceChildren(
      message,
      createButton(t('selection.selectAll'), selectAllVisible),
      createButton(t('selection.archive'), () => setPhase({ name: 'confirming', action: 'archive' }), !count),
      createButton(t('selection.delete'), () => setPhase({ name: 'confirming', action: 'remove' }), !count),
      createButton(t('selection.cancel'), () => selectionState.setActive(false)),
    )
  }
  else if (phase.name === 'confirming') {
    const { action } = phase
    message.textContent = t(confirmKeyByAction[action], { count })
    const confirmButton = createButton(t('selection.confirm'), () => void run(action))
    confirmButton.dataset.variant = 'danger'
    bar.replaceChildren(
      message,
      createButton(t('selection.back'), () => setPhase({ name: 'choosing' })),
      confirmButton,
    )
  }
  else if (phase.name === 'running') {
    message.textContent = t(runningKeyByAction[phase.action], { count })
    bar.replaceChildren(message)
  }
  else {
    message.textContent = t('selection.partialFailure', {
      succeeded: phase.succeededCount,
      count: phase.failedCount,
    })
    bar.replaceChildren(
      message,
      createButton(t('selection.reload'), () => location.reload()),
      createButton(t('selection.back'), () => setPhase({ name: 'choosing' })),
    )
  }
}

// "All" means every conversation currently rendered on the page; claude.ai loads older ones on scroll.
function selectAllVisible() {
  const conversations = getVisibleConversationLinks().map((link) => link.conversation)
  selectionState.selectMany(conversations)
}

function setPhase(nextPhase: BarPhase) {
  phase = nextPhase
  render()
}

async function run(action: BulkAction) {
  setPhase({ name: 'running', action })

  const { succeeded, failed } = await runBatch(
    selectionState.items,
    (conversation) => runConversationAction(action, conversation),
    BULK_ACTION_CONCURRENCY,
  )

  // claude.ai caches its conversation lists client-side and cannot see these changes,
  // so a reload is the only way to show an accurate sidebar.
  if (!failed.length) {
    location.reload()
    return
  }

  for (const failure of failed) {
    console.error(`[claude-ai-enhancer] Bulk ${action} failed for "${failure.item.title}"`, failure.error)
  }

  // Only the failures stay selected, so retrying never repeats work that succeeded.
  phase = {
    name: 'reporting',
    succeededCount: succeeded.length,
    failedCount: failed.length,
  }
  selectionState.replace(failed.map((failure) => failure.item))
}

function createButton(label: string, onClick: () => void, isDisabled = false): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.disabled = isDisabled
  button.addEventListener('click', onClick)
  return button
}
