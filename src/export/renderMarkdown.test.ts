import type { ChatMessage, ContentBlock, Conversation } from '../api/types'

// Core
import { describe, expect, it, vi } from 'vitest'

// Misc
import { getActiveBranch, renderConversationMarkdown } from './renderMarkdown'

const EXPORTED_AT = new Date('2026-09-22T12:00:00.000Z')
const ROOT_PARENT = '00000000-0000-4000-8000-000000000000'

function buildMessage(
  uuid: string,
  sender: ChatMessage['sender'],
  parent: string,
  content: ContentBlock[],
): ChatMessage {
  return {
    uuid,
    sender,
    index: 0,
    created_at: '2026-09-20T00:00:00.000Z',
    content,
    attachments: [],
    files: [],
    parent_message_uuid: parent,
  }
}

function buildConversation(messages: ChatMessage[], leaf = messages.at(-1)?.uuid ?? ''): Conversation {
  return {
    uuid: '22222222-2222-4222-8222-222222222222',
    name: 'Dead Freight',
    model: 'claude-fable-5-1',
    created_at: '2026-09-20T00:00:00.000Z',
    updated_at: '2026-09-21T00:00:00.000Z',
    current_leaf_message_uuid: leaf,
    chat_messages: messages,
  }
}

function render(conversation: Conversation) {
  return renderConversationMarkdown(conversation, { exportedAt: EXPORTED_AT })
}

describe('getActiveBranch', () => {
  it('follows the current leaf and ignores regenerated or edited branches', () => {
    const conversation = buildConversation(
      [
        buildMessage('human-1', 'human', ROOT_PARENT, []),
        buildMessage('assistant-old', 'assistant', 'human-1', []),
        buildMessage('assistant-new', 'assistant', 'human-1', []),
        buildMessage('human-2', 'human', 'assistant-new', []),
      ],
      'human-2',
    )

    const uuids = getActiveBranch(conversation).map((message) => message.uuid)
    expect(uuids).toEqual(['human-1', 'assistant-new', 'human-2'])
  })

  it('falls back to index order and warns when the leaf is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = { ...buildMessage('first', 'human', ROOT_PARENT, []), index: 0 }
    const second = { ...buildMessage('second', 'assistant', 'first', []), index: 1 }

    const uuids = getActiveBranch(buildConversation([second, first], 'missing'))
      .map((message) => message.uuid)

    expect(uuids).toEqual(['first', 'second'])
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('terminates on a parent cycle instead of looping forever', () => {
    const conversation = buildConversation(
      [
        buildMessage('a', 'human', 'b', []),
        buildMessage('b', 'assistant', 'a', []),
      ],
      'b',
    )

    expect(getActiveBranch(conversation)).toHaveLength(2)
  })
})

describe('renderConversationMarkdown', () => {
  it('renders the header, speakers, and turn separators', () => {
    const markdown = render(buildConversation([
      buildMessage('human-1', 'human', ROOT_PARENT, [{ type: 'text', text: 'Hello' }]),
      buildMessage('assistant-1', 'assistant', 'human-1', [{ type: 'text', text: 'Hi there' }]),
    ]))

    expect(markdown).toBe([
      '# Dead Freight',
      '',
      '- **Model:** claude-fable-5-1',
      '- **Created:** 2026-09-20T00:00:00.000Z',
      '- **Updated:** 2026-09-21T00:00:00.000Z',
      '- **Link:** https://claude.ai/chat/22222222-2222-4222-8222-222222222222',
      '- **Exported:** 2026-09-22T12:00:00.000Z',
      '',
      '---',
      '',
      '**User**',
      '',
      'Hello',
      '',
      '---',
      '',
      '**Claude**',
      '',
      'Hi there',
      '',
    ].join('\n'))
  })

  it('renders a web search with its query and every result link', () => {
    const markdown = render(buildConversation([
      buildMessage('assistant-1', 'assistant', ROOT_PARENT, [
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'web_search',
          input: { query: 'co-op horror games' },
          message: 'Searching the web',
        },
        {
          type: 'tool_result',
          tool_use_id: 'toolu_1',
          name: 'web_search',
          is_error: false,
          content: [
            {
              type: 'knowledge',
              title: 'Species: Unknown',
              url: 'https://rawg.io/games/species-unknown',
              metadata: { site_name: 'rawg' },
            },
            { type: 'knowledge', title: 'No [site] name', url: 'https://example.com/a?b=c' },
          ],
        },
      ]),
    ]))

    expect(markdown).toContain('**Searching the web**: co-op horror games')
    expect(markdown).toContain('- [Species: Unknown](<https://rawg.io/games/species-unknown>) · rawg')
    expect(markdown).toContain('- [No \\[site\\] name](<https://example.com/a?b=c>)\n')
  })

  it('shows the full input of tools without a known headline field', () => {
    const markdown = render(buildConversation([
      buildMessage('assistant-1', 'assistant', ROOT_PARENT, [
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'repl',
          input: { code: 'console.log(1)' },
        },
      ]),
    ]))

    expect(markdown).toContain('**repl**\n\n<details>\n<summary>Input</summary>')
    expect(markdown).toContain('"code": "console.log(1)"')
  })

  it('turns citations into numbered footnotes shared across the transcript', () => {
    const text = 'First claim.\n\nSecond claim.'
    const markdown = render(buildConversation([
      buildMessage('assistant-1', 'assistant', ROOT_PARENT, [
        {
          type: 'text',
          text,
          citations: [
            {
              uuid: 'citation-1',
              title: 'Source A',
              url: 'https://a.example',
              start_index: 0,
              end_index: 'First claim.'.length,
            },
            {
              uuid: 'citation-2',
              title: 'Source B',
              url: 'https://b.example',
              start_index: 0,
              end_index: 'First claim.'.length,
            },
            {
              uuid: 'citation-3',
              title: 'Source A again',
              url: 'https://a.example',
              start_index: 14,
              end_index: text.length,
            },
          ],
        },
      ]),
    ]))

    expect(markdown).toContain('First claim.[^1][^2]\n\nSecond claim.[^1]')
    expect(markdown).toContain('[^1]: [Source A](<https://a.example>)\n[^2]: [Source B](<https://b.example>)')
  })

  it('renders thinking summaries when the full reasoning is absent', () => {
    const markdown = render(buildConversation([
      buildMessage('assistant-1', 'assistant', ROOT_PARENT, [
        { type: 'thinking', thinking: '', summaries: [{ summary: 'Weighing save systems.' }] },
        { type: 'thinking', thinking: '', summaries: [] },
      ]),
    ]))

    expect(markdown).toContain('<summary>Thought process</summary>\n\n- Weighing save systems.\n\n</details>')
    expect(markdown.match(/Thought process/g)).toHaveLength(1)
  })

  it('fences attachments with a fence longer than any backticks they contain', () => {
    const message = buildMessage('human-1', 'human', ROOT_PARENT, [{ type: 'text', text: 'See file' }])
    message.attachments = [{ file_name: 'notes.md', extracted_content: '```ts\ncode\n```' }]

    const markdown = render(buildConversation([message]))

    expect(markdown).toContain('<summary>Attachment: notes.md</summary>\n\n````\n```ts\ncode\n```\n````')
    expect(markdown.indexOf('notes.md')).toBeLessThan(markdown.indexOf('See file'))
  })

  it('skips unknown block types with a debug log instead of failing', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const unknownBlock = JSON.parse('{ "type": "image" }')

    const markdown = render(buildConversation([
      buildMessage('assistant-1', 'assistant', ROOT_PARENT, [unknownBlock, { type: 'text', text: 'Done' }]),
    ]))

    expect(markdown).toContain('**Claude**\n\nDone')
    expect(debug).toHaveBeenCalledOnce()
    debug.mockRestore()
  })
})

describe('renderConversationMarkdown tool results', () => {
  it('renders a bare string result as fenced text', () => {
    const markdown = render(buildConversation([
      buildMessage('assistant-1', 'assistant', ROOT_PARENT, [
        {
          type: 'tool_result',
          tool_use_id: 'toolu_1',
          name: 'repl',
          is_error: true,
          content: 'ReferenceError: x is not defined',
        },
      ]),
    ]))

    expect(markdown).toContain('*The tool reported an error.*')
    expect(markdown).toContain('```\nReferenceError: x is not defined\n```')
  })
})
