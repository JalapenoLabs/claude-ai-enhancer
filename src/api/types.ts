// Shapes returned by claude.ai's private conversation endpoint. Only the fields the
// exporter reads are typed; the API returns more and may add fields at any time.

export type CitationSource = {
  title: string
  url: string
  source?: string
}

export type Citation = {
  uuid: string
  title: string
  url: string
  start_index: number
  end_index: number
  sources?: CitationSource[]
}

export type TextBlock = {
  type: 'text'
  text: string
  citations?: Citation[]
}

export type ThinkingBlock = {
  type: 'thinking'
  thinking: string
  summaries?: { summary: string }[]
}

export type ToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  // Human-readable status such as "Searching the web", as shown in the claude.ai UI.
  message?: string
}

export type KnowledgeItem = {
  type: 'knowledge'
  title: string
  url: string
  metadata?: {
    site_name?: string
    site_domain?: string
  }
}

export type ToolResultTextItem = {
  type: 'text'
  text: string
}

export type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  name: string
  // Usually a list; some tools return their output as a bare string.
  content: (KnowledgeItem | ToolResultTextItem)[] | string
  is_error: boolean
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock

export type Attachment = {
  file_name: string
  extracted_content?: string
}

export type UploadedFile = {
  file_name: string
}

export type ChatMessage = {
  uuid: string
  sender: 'human' | 'assistant'
  index: number
  created_at: string
  content: ContentBlock[]
  attachments: Attachment[]
  files: UploadedFile[]
  parent_message_uuid: string
}

export type Conversation = {
  uuid: string
  name: string
  model: string | null
  created_at: string
  updated_at: string
  current_leaf_message_uuid: string
  chat_messages: ChatMessage[]
}
