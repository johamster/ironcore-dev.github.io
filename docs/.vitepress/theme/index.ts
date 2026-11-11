import DefaultTheme from 'vitepress/theme'
import { initAnalytics } from './utils/analytics'
import Mermaid from './components/Mermaid.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  async enhanceApp({ app, router }) {
    // Global so the <Mermaid> markup emitted by the mermaid markdown renderer
    // resolves without a per-page import.
    app.component('Mermaid', Mermaid)
    // Plausible is browser-only; guard against SSR build (enhanceApp also runs in Node).
    // Await init so the 404 hook is installed before the initial navigation runs.
    // Swallow init failures so a rejected tracker import never blocks app mount.
    if (!import.meta.env.SSR) {
      try {
        await initAnalytics(router)
      } catch (err) {
        console.error('[analytics] init failed:', err)
      }
    }
  },
}
