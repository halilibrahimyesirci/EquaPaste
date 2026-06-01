import '../ui/tokens.css';
import '../ui/pill.css';
import { initEquaPaste, type EquaPasteHandle } from '../content/init';

// Content script entrypoint. WXT mounts a shadow-root overlay so our UI is fully
// isolated from (and can't break) the host page. All detection + UI lives in
// src/content/* and src/ui/*.
export default defineContentScript({
  // Dev builds also match localhost so the in-page UI can be tested on a local
  // KaTeX fixture (tests/e2e/fixtures/katex-page.html). Stripped from production.
  matches: [
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://www.perplexity.ai/*',
    'https://perplexity.ai/*',
    'https://chat.deepseek.com/*',
    'https://www.google.com/search*', // Google Search "AI Mode" / AI Overviews
    ...(import.meta.env.DEV ? ['http://localhost/*', 'http://127.0.0.1/*'] : []),
  ],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi<EquaPasteHandle>(ctx, {
      name: 'equa-paste-ui',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount: (container) => {
        let handle: EquaPasteHandle | undefined;
        void initEquaPaste(container).then((h) => (handle = h));
        return {
          destroy: () => handle?.destroy(),
        };
      },
      onRemove: (mounted) => mounted?.destroy(),
    });
    ui.mount();
  },
});
