export type ConversationKind = 'chat' | 'code' | 'cowork'

export type BulkAction = 'archive' | 'remove'

export type SelectedConversation = {
  kind: ConversationKind
  // The id the kind's API expects, which is not always the id in the page URL.
  id: string
  title: string
  // The link's pathname, which identifies the conversation on the page.
  pathname: string
}
