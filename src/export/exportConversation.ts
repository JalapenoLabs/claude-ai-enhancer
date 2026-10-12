// Core
import { getConversation } from '../api/routes/chatConversationRoutes'

// Misc
import { renderConversationMarkdown } from './renderMarkdown'
import { t } from '../i18n'

export async function exportConversation(conversationId: string): Promise<void> {
  const conversation = await getConversation(conversationId)
  const markdown = renderConversationMarkdown(conversation, { exportedAt: new Date() })

  // Strip characters that Windows, macOS, or Linux reject in file names.
  const baseName = (conversation.name || t('transcript.untitled'))
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()

  const objectUrl = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${baseName || conversationId}.md`
  anchor.click()

  // Revoked on the next task: the download has started by then, and the URL is no longer needed.
  setTimeout(() => URL.revokeObjectURL(objectUrl))
}
