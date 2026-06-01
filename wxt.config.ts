import { defineConfig } from 'wxt';
import { asciiEscapeDir } from './scripts/ascii-escape.mjs';

// EquaPaste — WXT (MV3) configuration and manifest.
// Keep permissions MINIMAL: broad host permissions slow store review and erode trust.
export default defineConfig({
  srcDir: 'src',
  // Icons + the standalone Word-clipboard test harness live here and are copied verbatim.
  publicDir: 'public',
  // MV3 on every target. Firefox defaults to MV2 in WXT otherwise; Firefox MV3 is
  // GA since 109 (see browser_specific_settings.gecko below).
  manifestVersion: 3,
  // On Windows "localhost" resolves to IPv6 ::1 while Chrome dials 127.0.0.1,
  // so the HMR WebSocket can't connect. Pin the dev server to IPv4.
  dev: {
    server: { host: '127.0.0.1' },
  },
  // Don't auto-launch a fresh Chromium: Google blocks sign-in on the automated
  // profile, so AI chats can't be tested there. Instead load .output/chrome-mv3-dev
  // (or chrome-mv3) into your own, already-signed-in Chrome via "Load unpacked".
  // HMR still works — the dev build connects back to the dev server.
  webExt: {
    disabled: true,
  },
  // No inline source map: the 1.5 MB dev bundle made Chrome's HMR content-script
  // reload fail on Windows with a misleading "isn't UTF-8 encoded" error.
  vite: () => ({
    // No inline source map (kept the dev content-script bundle small enough for
    // Chrome's HMR reload on Windows). charset:'ascii' keeps strings escaped.
    build: { sourcemap: false },
    esbuild: { charset: 'ascii' },
  }),
  hooks: {
    // Post-build disk fixups (also runs for `wxt zip`): repair Temml's surrogate
    // escapes that the bundler mangled to U+FFFD (which broke \int/\sqrt/matrices),
    // and escape Unicode non-characters Chrome's content-script loader rejects.
    // See scripts/ascii-escape.mjs and docs/word-clipboard-findings.md.
    'build:done'(wxt) {
      asciiEscapeDir(wxt.config.outDir);
    },
  },
  manifest: ({ browser }) => ({
    name: 'EquaPaste',
    // <=132 chars; the pain + the fix, per store listing guidance.
    description:
      'Copy math from ChatGPT, Claude, Gemini, Perplexity & DeepSeek and paste it as a native, editable Word/Notion equation. 100% local.',
    // MVP host scope: only the AI chat domains we actually inject into.
    host_permissions: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
      'https://www.perplexity.ai/*',
      'https://perplexity.ai/*',
      'https://chat.deepseek.com/*',
    ],
    permissions: ['clipboardWrite', 'storage', 'activeTab', 'scripting'],
    commands: {
      'copy-default': {
        suggested_key: { default: 'Alt+Shift+E' },
        description: 'Copy the focused equation to your default target',
      },
      'copy-latex': {
        suggested_key: { default: 'Alt+Shift+L' },
        description: 'Copy the focused equation as LaTeX',
      },
    },
    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      128: '/icon/128.png',
    },
    action: {
      default_title: 'EquaPaste',
    },
    // Firefox needs an explicit id for MV3 signing.
    // Chrome rejects/ignores this key, so only emit it for Gecko targets.
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: { id: 'equapaste@equapaste.app', strict_min_version: '109.0' },
          },
        }
      : {}),
  }),
});
