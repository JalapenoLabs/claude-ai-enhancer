export const CLAUDE_ORIGIN = 'https://claude.ai'

// Conversation pages live at /chat/<uuid>. Claude Code sessions (/code/...) use a different API.
export const CHAT_PATH_PATTERN = /^\/chat\/([0-9a-f-]{36})/

// claude.ai stores the signed-in user's active organization in this cookie.
export const ACTIVE_ORGANIZATION_COOKIE = 'lastActiveOrg'

// Hooks into claude.ai's own markup. These are the only selectors the extension depends on.
export const SHARE_BUTTON_SELECTOR = '[data-testid="wiggle-controls-actions-share"]'
export const ACTIONS_GROUP_SELECTOR = '[data-testid="wiggle-controls-actions-group"]'
export const EXPORT_BUTTON_TEST_ID = 'claude-ai-enhancer-export'

export const EXPORT_FAILURE_DISPLAY_MS = 4000

// The Chat/Code app switcher in the sidebar header; the multi-select toggle sits just before it.
export const APP_SWITCH_SELECTOR = '.df-app-switch'

// Any of claude.ai's ghost icon-only buttons (such as Hide sidebar), mirrored by the multi-select toggle.
export const GHOST_ICON_BUTTON_SELECTOR = 'button[data-cds-icon-only][data-cds-ghost]'

// Prefix for every attribute and class the extension adds to claude.ai's DOM; content.css depends on it.
export const DOM_PREFIX = 'claude-ai-enhancer'

// Parallel requests per bulk action: fast for large selections without hammering the API.
export const BULK_ACTION_CONCURRENCY = 4
