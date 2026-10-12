import type { Conversation } from '../types'

// Misc
import { claudeApi, getActiveOrganizationId } from '../index'

export async function getConversation(conversationId: string) {
  return claudeApi
    .get(`organizations/${getActiveOrganizationId()}/chat_conversations/${conversationId}`, {
      searchParams: {
        // `tree` returns every branch so the exporter can follow the one on screen.
        // `render_all_tools` is what includes web searches and other tool calls.
        tree: 'True',
        rendering_mode: 'messages',
        render_all_tools: 'true',
      },
    })
    .json<Conversation>()
}

// claude.ai hides archived chats from its sidebar and unarchives a chat when a message is sent to it.
export async function archiveConversation(conversationId: string) {
  await claudeApi.put(`organizations/${getActiveOrganizationId()}/chat_conversations/${conversationId}`, {
    json: { is_archived: true },
  })
}

export async function deleteConversation(conversationId: string) {
  await claudeApi.delete(`organizations/${getActiveOrganizationId()}/chat_conversations/${conversationId}`)
}
