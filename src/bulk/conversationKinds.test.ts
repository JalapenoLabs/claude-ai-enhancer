// Core
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Misc
import { parseConversationLink, runConversationAction } from './conversationKinds'

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111'
const CHAT_ID = '22222222-2222-4222-8222-222222222222'

type CapturedRequest = {
  method: string
  url: string
  headers: Headers
  body: string
}

type Context = {
  fetchMock: ReturnType<typeof vi.fn>
  requests: CapturedRequest[]
}

describe('parseConversationLink', () => {
  it('parses chat links into their conversation uuid', () => {
    expect(parseConversationLink(`/chat/${CHAT_ID}`, 'Dead Freight')).toEqual({
      kind: 'chat',
      id: CHAT_ID,
      title: 'Dead Freight',
      pathname: `/chat/${CHAT_ID}`,
    })
  })

  it('maps Code session links to the cse_ id the sessions API uses', () => {
    const conversation = parseConversationLink('/code/session_01AqXRoFabc', 'Phase: Storybook')
    expect(conversation?.kind).toBe('code')
    expect(conversation?.id).toBe('cse_01AqXRoFabc')
  })

  it('parses Cowork task links, which already carry the sessions API id', () => {
    const conversation = parseConversationLink('/cowork/cse_01AqXRoFabc', 'Semi-Wiki profile interview')
    expect(conversation?.kind).toBe('cowork')
    expect(conversation?.id).toBe('cse_01AqXRoFabc')
  })

  it('ignores links that are not conversations', () => {
    const pathnames = ['/cowork/projects', '/code/routines', '/code', '/new', `/chat/${CHAT_ID}/extra`]
    for (const pathname of pathnames) {
      expect(parseConversationLink(pathname, 'title')).toBeUndefined()
    }
  })
})

describe('runConversationAction', () => {
  beforeEach<Context>((context) => {
    // The body is read inside the mock because ky consumes the Request once fetch resolves.
    context.requests = []
    context.fetchMock = vi.fn(async (request: Request) => {
      context.requests.push({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: await request.text(),
      })
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', context.fetchMock)
    vi.stubGlobal('document', { cookie: `theme=dark; lastActiveOrg=${ORGANIZATION_ID}` })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function captureRequest(context: Context, action: 'archive' | 'remove', pathname: string) {
    const conversation = parseConversationLink(pathname, 'title')
    if (!conversation) {
      throw new Error(`Test pathname ${pathname} did not parse`)
    }

    await runConversationAction(action, conversation)
    expect(context.requests).toHaveLength(1)
    return context.requests[0]!
  }

  it<Context>('archives a chat by setting is_archived', async (context) => {
    const request = await captureRequest(context, 'archive', `/chat/${CHAT_ID}`)

    expect(request.method).toBe('PUT')
    expect(request.url).toBe(`https://claude.ai/api/organizations/${ORGANIZATION_ID}/chat_conversations/${CHAT_ID}`)
    expect(JSON.parse(request.body)).toEqual({ is_archived: true })
  })

  it<Context>('deletes a chat', async (context) => {
    const request = await captureRequest(context, 'remove', `/chat/${CHAT_ID}`)

    expect(request.method).toBe('DELETE')
    expect(request.url).toBe(`https://claude.ai/api/organizations/${ORGANIZATION_ID}/chat_conversations/${CHAT_ID}`)
  })

  it<Context>('archives a Code session with the headers the sessions API requires', async (context) => {
    const request = await captureRequest(context, 'archive', '/code/session_01abc')

    expect(request.method).toBe('POST')
    expect(request.url).toBe('https://claude.ai/v1/code/sessions/cse_01abc/archive')
    expect(request.headers.get('anthropic-version')).toBe('2023-06-01')
    expect(request.headers.get('anthropic-beta')).toBe('ccr-byoc-2025-07-29')
    expect(request.headers.get('anthropic-client-feature')).toBe('ccr')
    expect(request.headers.get('x-organization-uuid')).toBe(ORGANIZATION_ID)
  })

  it<Context>('archives a Cowork task through the sessions API', async (context) => {
    const request = await captureRequest(context, 'archive', '/cowork/cse_01abc')

    expect(request.method).toBe('POST')
    expect(request.url).toBe('https://claude.ai/v1/code/sessions/cse_01abc/archive')
  })

  it<Context>('deletes a Code session', async (context) => {
    const request = await captureRequest(context, 'remove', '/code/session_01abc')

    expect(request.method).toBe('DELETE')
    expect(request.url).toBe('https://claude.ai/v1/code/sessions/cse_01abc')
    expect(request.headers.get('x-organization-uuid')).toBe(ORGANIZATION_ID)
  })

  it<Context>('rejects without a request when the organization cookie is missing', async (context) => {
    vi.stubGlobal('document', { cookie: '' })

    await expect(captureRequest(context, 'remove', `/chat/${CHAT_ID}`)).rejects.toThrow('lastActiveOrg')
    expect(context.fetchMock).not.toHaveBeenCalled()
  })
})
