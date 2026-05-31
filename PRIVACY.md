# Privacy Policy — EquaPaste

_Last updated: 2026-05-31_

**EquaPaste does not collect, store, transmit, or sell any user data.** It has no
backend, no analytics, and no telemetry. Everything happens locally in your browser.

## What EquaPaste accesses

- **The rendered equation you interact with.** On supported pages (ChatGPT, Claude),
  the extension reads the LaTeX source embedded in equations you hover or click, in
  order to convert and copy it. This data is processed in memory on your device and is
  never sent anywhere.
- **Your clipboard (write only).** When you click copy, the converted equation is
  written to your clipboard. EquaPaste does not read your clipboard.
- **Your settings.** Your preferences (default target, theme, enabled platforms) are
  stored locally via `chrome.storage.sync`. If you are signed into your browser, your
  browser may sync these settings across your own devices; they are not visible to us.

## What EquaPaste does NOT do

- No data is sent to any server. There is no server.
- No analytics, tracking, fingerprinting, or advertising.
- No reading of page content beyond the math equations you choose to copy.
- No remote code: all code ships inside the extension package (required by Manifest V3).

## Permissions

| Permission | Why |
|---|---|
| `clipboardWrite` | To write the converted equation to your clipboard when you click copy. |
| `activeTab` | To act on the current tab in response to your click / shortcut. |
| `scripting` | To run the in-page copy UI on supported pages. |
| `storage` | To save your settings locally. |
| Host access to `chatgpt.com`, `claude.ai` | To detect rendered equations on those pages. No other sites are accessed. |

## Contact

Questions or concerns: open an issue on the project's repository.
