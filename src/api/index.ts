// Lib
import ky from 'ky'

// Misc
import { ACTIVE_ORGANIZATION_COOKIE, CLAUDE_ORIGIN } from '../constants'

// The content script runs on claude.ai itself, so these same-origin requests carry the
// user's session cookies. No extension host permissions are needed.
export const claudeApi = ky.create({
  baseUrl: `${CLAUDE_ORIGIN}/api/`,
  credentials: 'include',
})

// Claude Code sessions live on a separate, Anthropic-API-style surface of the same origin.
// These headers mirror what the claude.ai client sends; the organization header is per request.
export const codeSessionsApi = ky.create({
  baseUrl: `${CLAUDE_ORIGIN}/v1/code/`,
  credentials: 'include',
  headers: {
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'ccr-byoc-2025-07-29',
    'anthropic-client-feature': 'ccr',
  },
})

export function getActiveOrganizationId(): string {
  const organizationId = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${ACTIVE_ORGANIZATION_COOKIE}=`))
    ?.split('=')[1]

  if (!organizationId) {
    throw new Error(`The '${ACTIVE_ORGANIZATION_COOKIE}' cookie is missing, so the organization is unknown`)
  }

  return organizationId
}
