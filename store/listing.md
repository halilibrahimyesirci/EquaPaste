# Chrome Web Store listing (draft)

Copy/paste fields for submission. Keep permissions minimal for fast review.

## Name

EquaPaste — copy AI math into Word

## Short description (≤132 chars)

Copy math from ChatGPT & Claude and paste it as a native, editable equation in Word, Notion, Obsidian & more. 100% local.

## Detailed description

Tired of copying an equation from ChatGPT or Claude only to watch it turn into broken
LaTeX in Word? EquaPaste fixes that in one click.

Hover any equation in ChatGPT or Claude — the whole block highlights and a Copy button
appears. Click it and the equation lands in your document as a real, editable equation:
native OfficeMath in Word, a math block in Notion, `$$…$$` in Obsidian/Markdown, and more.

• One click, right where you read the answer — no menus, no setup.
• Native, editable results — not screenshots, not raw source code.
• 100% local: no servers, no tracking, no account. Conversion happens in your browser.
• Multiple destinations: Word, Word Online, Notion, Obsidian, GitHub/GitLab Markdown,
  LaTeX, MathML, and Google Docs (as an image with the LaTeX saved in alt text).
• Light/dark aware, keyboard accessible, open source (MIT).

Honest note: Google Docs has no way to accept a native equation from the clipboard, so
EquaPaste pastes an image and embeds the source LaTeX in the alt text.

Works today on ChatGPT and Claude. Gemini, Copilot, and Perplexity are planned.

## Category

Productivity

## Single-purpose declaration

EquaPaste detects rendered LaTeX/math equations on supported AI chat pages and lets the
user one-click copy them as native, editable equations (or an image with LaTeX alt text)
to their clipboard for pasting into document editors. It does no other work.

## Permission justifications

- **clipboardWrite** — Required to write the converted equation (OMML/MathML/LaTeX/image)
  to the clipboard when the user clicks Copy.
- **activeTab** — Acts on the current tab only in response to the user's click or keyboard
  shortcut; no install-time host warning.
- **scripting** — Runs the in-page copy UI (shadow-DOM pill) on supported pages.
- **storage** — Stores the user's preferences (default target, theme) locally. No data
  leaves the device.
- **Host permissions (chatgpt.com, claude.ai)** — Limited to the AI chat domains where
  rendered equations appear, so the content script can detect and convert them. No
  broad `<all_urls>` access is requested.

## Data use disclosure

"This extension does not collect user data." Certify the three Limited Use statements:
data is not sold, not used for unrelated purposes, not used for creditworthiness.

Privacy policy URL: publish PRIVACY.md on GitHub Pages and link it here.

## Assets checklist

- [ ] 128×128 store icon (provided: public/icon/128.png — replace with branded art before launch)
- [ ] At least one 1280×800 screenshot — ideally a GIF-like flow: copy in ChatGPT → native equation in Word
- [ ] 440×280 small promo tile
- [ ] (optional) 1400×560 marquee

## Other stores

- **Edge Add-ons:** free; submit the same `.zip` (`pnpm zip`).
- **Firefox AMO:** free; `pnpm zip:firefox` (manifest includes the required gecko id and a
  non-persistent background for Firefox). Provide source + build steps if asked.
