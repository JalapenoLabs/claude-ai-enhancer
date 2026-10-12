# Bulk archive and delete

A mouse-pointer icon button sits in the sidebar header, between the Claude logo and the Chat/Code switcher, with a
"Multi-select mode" tooltip. While it is on, clicking a conversation link selects it instead of opening it, and a
bar pinned to the top center of the viewport offers **Archive**, **Delete**, and **Cancel**. Escape, Cancel, or the
toggle leaves selection mode and clears the selection.

- **Select all** adds every conversation link currently rendered on the page (hidden sidebars excluded).
  claude.ai loads older conversations on scroll, so "all" means all loaded.
- **Shift-click** selects everything between the last plain click and the clicked link, inclusive, in page order.
  Consecutive shift-clicks extend from the same starting point, and ranges only add to the selection. When the
  starting conversation appears twice (pinned and recent), the occurrence nearest the click is used. Shift-clicking
  with no starting point on the page falls back to a plain toggle.

Selection works on every conversation link on the page (sidebar lists, pinned items, conversation titles in the
Recents table), not only the sidebar. It only covers conversations currently rendered; sweeping hundreds of old chats would need an
API-listed manager view, which is on the roadmap.

## Supported conversations

`src/bulk/conversationKinds.ts` is the single lookup table of supported kinds, keyed by `ConversationKind`. Each
entry parses link pathnames into API ids and maps each `BulkAction` to its API call.

| Kind   | Link                     | API id       | Archive                                                  | Delete                                              |
|--------|--------------------------|--------------|----------------------------------------------------------|-----------------------------------------------------|
| `chat` | `/chat/<uuid>`           | `<uuid>`     | `PUT /api/organizations/{org}/chat_conversations/{id}` with `{ "is_archived": true }` | `DELETE /api/organizations/{org}/chat_conversations/{id}` |
| `code` | `/code/session_<suffix>` | `cse_<suffix>` | `POST /v1/code/sessions/{id}/archive` with `{}`       | `DELETE /v1/code/sessions/{id}`                     |
| `cowork` | `/cowork/cse_<suffix>` | `cse_<suffix>` | same as `code`                                         | same as `code`                                      |

- Cowork tasks are sessions on the same API as Claude Code; claude.ai's bundle has a single session archive and
  delete endpoint serving both.
- Session requests send the headers the claude.ai client sends: `anthropic-version: 2023-06-01`,
  `anthropic-beta: ccr-byoc-2025-07-29`, `anthropic-client-feature: ccr`, and `x-organization-uuid`.
- claude.ai's own Recents page has a native Select → Delete for chats. This feature adds chat archiving and covers
  Claude Code sessions and Cowork tasks, which have no native multi-select.

## Behavior

- Both actions require an inline confirmation in the bar. Deletes are permanent, and claude.ai hides archived chats
  from its sidebar and Recents lists (sending a message to an archived chat unarchives it).
- Requests run four at a time (`BULK_ACTION_CONCURRENCY`) through `runBatch`, which never stops on a failure.
- When everything succeeds the page reloads, since claude.ai caches its lists client-side and cannot see the change.
- When anything fails, the bar reports the counts, only the failed conversations stay selected so a retry never
  repeats finished work, and each failure is logged to the console with its title and error.

## Page integration

- The toggle is inserted before `.df-app-switch` and mirrors one of claude.ai's ghost icon buttons
  (`createMirroredButton`), so it matches the header's styling. Its tooltip is CSS, rendered from `aria-label`.
- The action bar uses inverted theme colors (`--cds-text-primary` background) so it stands apart from the page, and
  sits at the top so it never covers the message composer.
- A capture-phase click listener on `document` intercepts selection clicks before React's root listener sees them,
  so neither claude.ai's handlers nor the browser's navigation run.
- Selected links carry `data-claude-ai-enhancer-selected`, re-applied after every React re-render; `<html>` carries
  `data-claude-ai-enhancer-selecting` while the mode is on. `public/content.css` styles both from claude.ai's
  `--cds-*` design tokens.
