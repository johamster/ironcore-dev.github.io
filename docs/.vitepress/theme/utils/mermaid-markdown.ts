// Markdown renderer for ```mermaid fenced blocks.
// Replaces the deprecated vitepress-plugin-mermaid (pinned to mermaid 10/11).
//
// The emitted markup is a plain <Mermaid> element carrying the diagram source
// URI-encoded in the `graph` attribute; the component is registered globally in
// theme/index.ts and renders the SVG client-side (mermaid is browser-only).
import type MarkdownIt from 'markdown-it'

export function mermaidMarkdown(md: MarkdownIt): void {
  // markdown-it always defines the default fence rule; nothing in this setup
  // replaces or removes it. ("!" asserts that to the type checker.)
  const fence = md.renderer.rules.fence!
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const info = token.info.trim()
    // Exact match on purpose: ```mermaid fences with extra info text render as
    // code blocks, matching vitepress-plugin-mermaid's behavior.
    if (info === 'mermaid') {
      // Transit is encodeURIComponent: it already covers '"' (attribute
      // delimiter), only HTML-special chars not handled by it need extra
      // escaping ('&', '<'). "'" stays as-is: legal inside a "-quoted attr.
      const graph = encodeURIComponent(token.content)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
      return `<Mermaid class="mermaid" graph="${graph}"></Mermaid>`
    }
    return fence(tokens, idx, options, env, self)
  }
}
