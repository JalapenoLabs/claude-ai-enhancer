import type {
  Attachment,
  ChatMessage,
  Citation,
  CitationSource,
  ContentBlock,
  Conversation,
  TextBlock,
  ThinkingBlock,
  ToolResultBlock,
  ToolUseBlock,
} from '../api/types'

// Misc
import { CLAUDE_ORIGIN } from '../constants'
import { t } from '../i18n'

type RenderOptions = {
  exportedAt: Date
}

// Citations become Markdown footnotes numbered across the whole transcript,
// so a source cited in several replies keeps one number and one definition.
type FootnoteRegistry = {
  numberByUrl: Map<string, number>
  definitions: string[]
}

// The one input field worth showing inline for well-known tools, mirroring the claude.ai UI
// ("Searching the web: <query>"). Any other tool falls back to its full input as JSON.
const headlineInputKeyByToolName: Record<string, string> = {
  web_search: 'query',
  web_fetch: 'url',
  memory_read: 'path',
}

export function renderConversationMarkdown(conversation: Conversation, options: RenderOptions): string {
  const footnotes: FootnoteRegistry = {
    numberByUrl: new Map(),
    definitions: [],
  }

  const sections = [renderHeader(conversation, options.exportedAt)]
  for (const message of getActiveBranch(conversation)) {
    sections.push(renderMessage(message, footnotes))
  }

  if (footnotes.definitions.length) {
    sections.push(footnotes.definitions.join('\n'))
  }

  return `${sections.join('\n\n---\n\n')}\n`
}

/**
 * The API returns every branch of the conversation (edited prompts, regenerated replies).
 * The transcript is the branch currently on screen: walk from the current leaf up through
 * each parent, then reverse into reading order.
 */
export function getActiveBranch(conversation: Conversation): ChatMessage[] {
  const messageByUuid = new Map<string, ChatMessage>()
  for (const message of conversation.chat_messages) {
    messageByUuid.set(message.uuid, message)
  }

  let current = messageByUuid.get(conversation.current_leaf_message_uuid)
  if (!current) {
    console.warn(
      '[claude-ai-enhancer] Current leaf message not found, exporting every message in index order',
      conversation.current_leaf_message_uuid,
    )
    return conversation.chat_messages.toSorted((left, right) => left.index - right.index)
  }

  // Bounded by the message count so malformed parent links can never loop forever.
  const branch: ChatMessage[] = []
  while (current && branch.length < conversation.chat_messages.length) {
    branch.push(current)
    current = messageByUuid.get(current.parent_message_uuid)
  }

  return branch.reverse()
}

function renderHeader(conversation: Conversation, exportedAt: Date): string {
  const metadata = [
    [t('transcript.metadata.model'), conversation.model],
    [t('transcript.metadata.created'), conversation.created_at],
    [t('transcript.metadata.updated'), conversation.updated_at],
    [t('transcript.metadata.link'), `${CLAUDE_ORIGIN}/chat/${conversation.uuid}`],
    [t('transcript.metadata.exported'), exportedAt.toISOString()],
  ]

  const lines = [`# ${conversation.name || t('transcript.untitled')}`, '']
  for (const [label, value] of metadata) {
    if (value) {
      lines.push(`- **${label}:** ${value}`)
    }
  }

  return lines.join('\n')
}

function renderMessage(message: ChatMessage, footnotes: FootnoteRegistry): string {
  // Speakers are bold labels under the `---` divider rather than headings, so the headings
  // Claude writes in its own replies never collide with the transcript's structure.
  const parts = [`**${t(`transcript.speaker.${message.sender}`)}**`]

  // Attachments sit above the prompt in the claude.ai UI, so they lead here too.
  for (const attachment of message.attachments) {
    parts.push(renderAttachment(attachment))
  }
  for (const file of message.files) {
    parts.push(`*${t('transcript.file', { fileName: file.file_name })}*`)
  }

  for (const block of message.content) {
    const rendered = renderBlock(block, footnotes)
    if (rendered) {
      parts.push(rendered)
    }
  }

  return parts.join('\n\n')
}

function renderBlock(block: ContentBlock, footnotes: FootnoteRegistry): string {
  switch (block.type) {
    case 'text':
      return renderText(block, footnotes)
    case 'thinking':
      return renderThinking(block)
    case 'tool_use':
      return renderToolUse(block)
    case 'tool_result':
      return renderToolResult(block)
    default:
      console.debug('[claude-ai-enhancer] Skipping unsupported content block', block)
      return ''
  }
}

function renderText(block: TextBlock, footnotes: FootnoteRegistry): string {
  if (!block.citations?.length) {
    return block.text.trim()
  }

  // Several citations can close at the same offset (claude.ai groups them at paragraph ends).
  const citationsByEndIndex = new Map<number, Citation[]>()
  for (const citation of block.citations) {
    const group = citationsByEndIndex.get(citation.end_index) ?? []
    group.push(citation)
    citationsByEndIndex.set(citation.end_index, group)
  }

  // Walk forward through the text so footnotes are numbered in reading order
  // and each offset still refers to the original, unmodified text.
  const endIndexes = [...citationsByEndIndex.keys()].toSorted((left, right) => left - right)
  const pieces: string[] = []
  let cursor = 0
  for (const endIndex of endIndexes) {
    const markers = new Set<string>()
    for (const citation of citationsByEndIndex.get(endIndex) ?? []) {
      const sources: CitationSource[] = citation.sources?.length
        ? citation.sources
        : [{ title: citation.title, url: citation.url }]
      for (const source of sources) {
        markers.add(`[^${registerFootnote(footnotes, source)}]`)
      }
    }

    pieces.push(block.text.slice(cursor, endIndex), [...markers].join(''))
    cursor = endIndex
  }
  pieces.push(block.text.slice(cursor))

  return pieces.join('').trim()
}

function registerFootnote(footnotes: FootnoteRegistry, source: CitationSource): number {
  const existing = footnotes.numberByUrl.get(source.url)
  if (existing) {
    return existing
  }

  const number = footnotes.numberByUrl.size + 1
  footnotes.numberByUrl.set(source.url, number)
  footnotes.definitions.push(`[^${number}]: ${renderLink(source.title, source.url)}`)
  return number
}

function renderThinking(block: ThinkingBlock): string {
  // claude.ai often stores only summaries of the reasoning, with `thinking` left empty.
  const body = block.thinking.trim()
    || block.summaries?.map((entry) => `- ${entry.summary}`).join('\n')

  if (!body) {
    return ''
  }

  return renderDetails(t('transcript.thoughtProcess'), body)
}

function renderToolUse(block: ToolUseBlock): string {
  const headline = `**${block.message || block.name}**`

  const headlineInputKey = headlineInputKeyByToolName[block.name]
  const headlineInput = headlineInputKey && block.input[headlineInputKey]
  if (typeof headlineInput === 'string') {
    return `${headline}: ${headlineInput}`
  }

  if (!Object.keys(block.input).length) {
    return headline
  }

  const input = renderFence(JSON.stringify(block.input, null, 2), 'json')
  return `${headline}\n\n${renderDetails(t('transcript.toolInput'), input)}`
}

function renderToolResult(block: ToolResultBlock): string {
  const items = typeof block.content === 'string'
    ? [{ type: 'text', text: block.content } as const]
    : block.content

  const links: string[] = []
  const texts: string[] = []
  for (const item of items) {
    if (item.type === 'knowledge') {
      const siteName = item.metadata?.site_name || item.metadata?.site_domain
      const suffix = siteName
        ? ` · ${siteName}`
        : ''
      links.push(`- ${renderLink(item.title, item.url)}${suffix}`)
    }
    else if (item.type === 'text') {
      texts.push(item.text)
    }
  }

  const parts: string[] = []
  if (block.is_error) {
    parts.push(`*${t('transcript.toolError')}*`)
  }
  if (links.length) {
    parts.push(links.join('\n'))
  }
  if (texts.length) {
    parts.push(renderDetails(t('transcript.toolResult'), renderFence(texts.join('\n\n'))))
  }

  return parts.join('\n\n')
}

function renderAttachment(attachment: Attachment): string {
  const label = t('transcript.attachment', { fileName: attachment.file_name })
  if (!attachment.extracted_content) {
    return `*${label}*`
  }

  return renderDetails(label, renderFence(attachment.extracted_content))
}

// <details> keeps long secondary content (reasoning, raw tool output, pasted files)
// complete in the file while collapsed in renderers such as GitHub and Obsidian.
function renderDetails(summary: string, body: string): string {
  return `<details>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`
}

// The fence must be longer than any backtick run inside the content, or embedded
// code blocks (common in tool output and pasted files) would close it early.
function renderFence(content: string, language = ''): string {
  const longestBacktickRun = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length))
  const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1))
  return `${fence}${language}\n${content}\n${fence}`
}

function renderLink(title: string, url: string): string {
  const escapedTitle = (title || url).replace(/[[\]]/g, '\\$&')
  return `[${escapedTitle}](<${url}>)`
}
