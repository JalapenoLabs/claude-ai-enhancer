# Markdown export

An **Export** button sits immediately left of claude.ai's **Share** button on `/chat/<uuid>` pages. Clicking it
downloads the conversation as `<conversation name>.md`.

## Data source

The export reads claude.ai's private conversation endpoint rather than scraping the DOM, since the page virtualizes
and collapses content (thinking, tool results, search result lists) that the export must include in full:

```
GET /api/organizations/{organizationId}/chat_conversations/{conversationId}
    ?tree=True&rendering_mode=messages&render_all_tools=true
```

- The organization id comes from the `lastActiveOrg` cookie. The export fails with a logged error if it is absent.
- `render_all_tools=true` is required; without it the response omits tool calls such as web searches.
- `tree=True` returns every branch (edited prompts, regenerated replies). The export follows the branch on screen by
  walking `parent_message_uuid` from `current_leaf_message_uuid`.

Claude Code sessions (`/code/...`) use a different API and are not exported today.

## Format

`src/export/renderMarkdown.ts` is a pure function from the API response to Markdown, covered by
`renderMarkdown.test.ts`.

- A metadata list heads the file: model, created, updated, link, and export time as ISO 8601 timestamps.
- Each message opens with a `---` divider and a bold `**User**` or `**Claude**` label. Speakers are not headings,
  so headings inside Claude's replies keep their own levels without colliding with the transcript structure.
- Assistant content blocks render in order:
  - **text** verbatim. Citations become Markdown footnotes (`[^n]`), numbered across the whole transcript so a
    source cited twice keeps one number; definitions are collected at the end of the file.
  - **thinking** in a `<details>` block titled "Thought process". claude.ai often stores only reasoning summaries,
    which render as a bullet list when the full reasoning is empty.
  - **tool_use** as its UI status line in bold (for example `**Searching the web**`). Web search, web fetch, and
    memory reads show their query, URL, or path inline; any other tool shows its full input as JSON in `<details>`.
  - **tool_result** as a link list for search results (`- [title](<url>) · site`) and a fenced `<details>` block
    for text output. Errors are flagged.
  - Unknown block types are skipped with a `console.debug`.
- Human attachments with extracted text render as fenced `<details>` blocks above the prompt; uploaded files are
  listed by name.
- Link destinations use angle brackets so URLs with spaces or parentheses stay intact, and code fences grow longer
  than any backtick run in their content.

`<details>` keeps long secondary content in the file while collapsing it in GitHub, Obsidian, and similar renderers.
