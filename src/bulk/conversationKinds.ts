import type { BulkAction, ConversationKind, SelectedConversation } from './types'

// Core
import { archiveConversation, deleteConversation } from '../api/routes/chatConversationRoutes'
import { archiveCodeSession, deleteCodeSession } from '../api/routes/codeSessionRoutes'

type ConversationKindDefinition = {
  // Returns the API id for a link pathname of this kind, or undefined for any other link.
  parseId: (pathname: string) => string | undefined
  actions: Record<BulkAction, (id: string) => Promise<void>>
}

const conversationKindDefinitions = {
  chat: {
    parseId: (pathname) => /^\/chat\/([0-9a-f-]{36})$/.exec(pathname)?.[1],
    actions: {
      archive: archiveConversation,
      remove: deleteConversation,
    },
  },
  code: {
    // Links use `session_<id>` while the sessions API lists the same session as `cse_<id>`.
    parseId: (pathname) => {
      const suffix = /^\/code\/session_([A-Za-z0-9]+)$/.exec(pathname)?.[1]
      return suffix && `cse_${suffix}`
    },
    actions: {
      archive: archiveCodeSession,
      remove: deleteCodeSession,
    },
  },
  // Cowork tasks are sessions on the same API as Claude Code, and their links already use the API id.
  cowork: {
    parseId: (pathname) => /^\/cowork\/(cse_[A-Za-z0-9]+)$/.exec(pathname)?.[1],
    actions: {
      archive: archiveCodeSession,
      remove: deleteCodeSession,
    },
  },
} as const satisfies Record<ConversationKind, ConversationKindDefinition>

// Object.keys is typed as string[]; the `satisfies` above guarantees these are exactly the kinds.
const conversationKinds = Object.keys(conversationKindDefinitions) as ConversationKind[]

/**
 * Identifies the conversation a link points to. Returns undefined for links to anything else.
 */
export function parseConversationLink(pathname: string, title: string): SelectedConversation | undefined {
  for (const kind of conversationKinds) {
    const id = conversationKindDefinitions[kind].parseId(pathname)
    if (id) {
      return { kind, id, title, pathname }
    }
  }

  return undefined
}

export function runConversationAction(action: BulkAction, conversation: SelectedConversation): Promise<void> {
  return conversationKindDefinitions[conversation.kind].actions[action](conversation.id)
}
