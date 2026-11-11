<template>
  <div class="mermaid" v-html="svg"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId, watch } from 'vue'
import type { MermaidConfig } from 'mermaid'

const props = defineProps<{
  graph: string
}>()

// Per-instance id: two components showing the same diagram on one page must
// not race over mermaid's shared temp element, which it keys by this id.
const diagramId = `mermaid-${useId().replace(/:/g, '')}`

// Mirrors the defaults the vitepress-plugin-mermaid used: loose security allows
// <img>/fonts inside labels, startOnLoad off because we render imperatively.
// 'loose' permits script execution in labels — safe here because every diagram
// is reviewed markdown in this repo; don't reuse verbatim with untrusted sources.
const baseConfig: MermaidConfig = {
  securityLevel: 'loose',
  startOnLoad: false,
  flowchart: {
    // Let diagrams shrink to the content width instead of being clamped to the
    // parent, which keeps long labels inside their node boxes.
    useMaxWidth: false,
    // Default is 120, which wraps long quoted labels (e.g.
    // "Infrastructure as a Service (IaaS)") to >2 lines and lets them spill
    // out of the node rect. Widen so the rect fits the label.
    wrappingWidth: 220,
  },
}

const svg = ref('')
let observer: MutationObserver | null = null
let renderSeq = 0

onMounted(async () => {
  await render()

  // Re-render when VitePress toggles <html class="dark"> so the diagram theme
  // follows the site theme.
  observer = new MutationObserver(async () => {
    await render()
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => observer?.disconnect())

// graph is static in practice (markdown-generated attribute), but if it ever
// changes the rendered SVG must follow rather than silently go stale.
watch(() => props.graph, render)

async function render(): Promise<void> {
  const seq = ++renderSeq

  // Dynamic import keeps mermaid (~2MB with bundled ELK) out of the main bundle
  // and out of the Node SSR build (this component never runs there anyway,
  // onMounted is client-only, but the import specifier must still resolve).
  const mermaid = (await import('mermaid')).default
  if (seq !== renderSeq) return // superseded by a newer render

  const config: MermaidConfig = { ...baseConfig }
  if (document.documentElement.classList.contains('dark')) {
    config.theme = 'dark'
  }

  // Re-initializing with the same config on every render is intentional and
  // supported by mermaid v12; render() applies theme changes, there is no
  // separate "set theme" API.
  mermaid.initialize(config)

  const code = decodeURIComponent(props.graph)
  let rendered: string
  try {
    rendered = (await mermaid.render(diagramId, code)).svg
  } catch (err) {
    if (seq !== renderSeq) return
    console.error(`[mermaid] render failed:`, err)
    const escaped = String(err).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    svg.value = `<pre class="mermaid-error">mermaid render failed: ${escaped}</pre>`
    return
  }
  if (seq !== renderSeq) return

  // Force v-html to re-render even when the SVG string is identical to the
  // previous one (theme switch / reload). Without this, mermaid deletes the
  // SVG while re-rendering and Vue never restores it. A per-render counter keeps
  // the marker unique and greppable ("mermaid-render-N" in the DOM).
  svg.value = `${rendered}<span style="display:none">mermaid-render-${seq}</span>`
}
</script>
