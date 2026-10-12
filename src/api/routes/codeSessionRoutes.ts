// Misc
import { codeSessionsApi, getActiveOrganizationId } from '../index'

// Sessions back both Claude Code and Cowork tasks, so these routes serve both.

export async function archiveCodeSession(sessionId: string) {
  await codeSessionsApi.post(`sessions/${sessionId}/archive`, {
    headers: { 'x-organization-uuid': getActiveOrganizationId() },
    json: {},
  })
}

export async function deleteCodeSession(sessionId: string) {
  await codeSessionsApi.delete(`sessions/${sessionId}`, {
    headers: { 'x-organization-uuid': getActiveOrganizationId() },
  })
}
