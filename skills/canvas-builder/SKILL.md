---
name: canvas-builder
description: Teaches agents how to output structured canvas definitions for the Shapeshifter tab
---

## Reading the Current Canvas

The canvas is a file in the vault. Before updating, always read it first:
- Path: `projects/<current-project-slug>/canvas.json`
- Use the `read` tool to load it, then emit the full updated canvas with your changes merged in.
- If the file doesn't exist yet, start fresh.

## Critical Rules

- Output `<canvas>` as a **raw tag** — never inside backticks or code fences.
- Put `<canvas>` at the **END** of your response, after all conversational text.
- Always include **ALL existing blocks** — the full canvas replaces the previous one. Never drop blocks the user hasn't removed.
- IDs are short and stable: `b1`, `b2`, `b3` for blocks; `t1`, `t2` for task items.

## When to Emit a Canvas

- User asks to add something to their canvas or Shapeshifter tab.
- You produce a plan, outline, checklist, or structured artifact worth persisting.
- A key decision, reference, or resource should stay permanently visible.
- The project's scope or status changes meaningfully.

## Output Format

<canvas>
{
  "blocks": [
    { "id": "b1", "type": "markdown", "content": "# Title\n\nOne-line description." },
    { "id": "b2", "type": "tasks", "title": "Next steps", "items": [
      { "id": "t1", "text": "Do the thing", "done": false }
    ]},
    { "id": "b3", "type": "note", "title": "Key insight", "content": "Main idea.", "color": "amber" }
  ]
}
</canvas>

## Block Types

This is a **fixed block system** — 10 types total. You cannot render arbitrary UI; compose these blocks to represent any content.

| type | required fields | optional fields | visual |
|------|----------------|-----------------|--------|
| `markdown` | `content` | — | Rich text with headers, bold, lists, inline code |
| `tasks` | `items` ({id, text, done}) | `title` | Interactive checklist with tap-to-toggle checkboxes |
| `note` | `content` | `title`, `color` (amber/blue/green/red) | Coloured left-border callout box |
| `links` | `items` ({id, label, url}) | `title` | List of labelled URL rows |
| `code` | `content` | `language`, `title` | Dark-background code block with optional language label |
| `section` | — | `label` | Horizontal divider with optional centred label |
| `button` | — | `label`, `content`, `action` ('chat'/'file'), `file` (vault path) | Tappable CTA; opens chat (default) or a vault file |
| `filetabs` | `tabs` ({id, label, file}) | — | Tab strip that loads different vault files per tab |
| `input` | — | `title` | Multi-line text field the user can type into; content saved back to canvas |
| `html` | `content` (complete HTML string) | `height` (px, omit to auto-size) | Sandboxed WebView — renders arbitrary HTML/CSS/JS inline |

**input block note:** Omit `content` when creating — the app fills it in as the user types. Schema: `{ "id": "b1", "type": "input", "title": "Optional label" }`

**html block note:** Write complete, self-contained HTML — all CSS in `<style>` tags, all JS in `<script>` tags, no external CDN links. Omit `height` to let the app measure automatically. Use for charts, tables, custom layouts, or anything the other block types can't express.

## Example — Talk Prep Canvas

Your conversational reply goes here, then immediately after:

<canvas>
{
  "blocks": [
    { "id": "b1", "type": "markdown", "content": "# Friend Zone Talk\n\n**One point:** Real friendship requires risk.\n\n**Key phrase:** You can't stay safe and stay close at the same time." },
    { "id": "b2", "type": "tasks", "title": "Prep checklist", "items": [
      { "id": "t1", "text": "Write the ME opening story", "done": false },
      { "id": "t2", "text": "Find the WE illustration", "done": false },
      { "id": "t3", "text": "Memorise the key phrase", "done": false }
    ]},
    { "id": "b3", "type": "note", "title": "Opening tension", "content": "Everyone wants deep friendship. Almost nobody risks the vulnerability it requires.", "color": "blue" }
  ]
}
</canvas>

## Composition Note

This is a fixed block system with 10 types. Agents cannot render arbitrary UI — only compose these blocks. Any content that doesn't fit a block type should be expressed as `markdown`.
