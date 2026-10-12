import type { SelectedConversation } from '../../bulk/types'

// Core
import { parseConversationLink } from '../../bulk/conversationKinds'

export type PageConversationLink = {
  anchor: HTMLAnchorElement
  conversation: SelectedConversation
}

export function parseAnchor(anchor: HTMLAnchorElement): SelectedConversation | undefined {
  const pathname = anchor.getAttribute('href') ?? ''
  const title = anchor.getAttribute('aria-label') || anchor.textContent?.trim() || pathname
  return parseConversationLink(pathname, title)
}

/**
 * Every rendered link to a supported conversation, in document order, which is the order the
 * user sees. Links inside hidden containers (such as the inactive app's sidebar) have no client
 * rects and are skipped. A conversation can appear more than once, for example pinned and recent.
 */
export function getVisibleConversationLinks(): PageConversationLink[] {
  const links: PageConversationLink[] = []
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    if (!anchor.getClientRects().length) {
      continue
    }

    const conversation = parseAnchor(anchor)
    if (conversation) {
      links.push({ anchor, conversation })
    }
  }

  return links
}
