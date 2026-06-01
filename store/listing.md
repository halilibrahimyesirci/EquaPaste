# Chrome Web Store listing (draft)

Copy/paste fields for submission. Keep permissions minimal for fast review.

## Name

EquaPaste — copy AI math into Word

## Short description (≤132 chars)

Copy math from ChatGPT, Claude, Gemini, Perplexity & DeepSeek and paste it as a native, editable Word/Notion equation. 100% local.

## Detailed description

Tired of copying an equation from ChatGPT, Claude or Gemini only to watch it turn into
broken LaTeX in Word? EquaPaste fixes that in one click.

Hover any equation in ChatGPT, Claude, Gemini, Perplexity or DeepSeek — the whole block highlights and a Copy button
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

Works today on ChatGPT, Claude, Gemini, Perplexity, and DeepSeek. Microsoft Copilot is planned.

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
- **Host permissions (chatgpt.com, claude.ai, gemini.google.com, perplexity.ai, chat.deepseek.com)** —
  Limited to the AI chat domains where rendered equations appear, so the content script can
  detect and convert them. No broad `<all_urls>` access is requested.

## Data use disclosure

"This extension does not collect user data." Certify the three Limited Use statements:
data is not sold, not used for unrelated purposes, not used for creditworthiness.

Privacy policy URL: https://github.com/halilibrahimyesirci/EquaPaste/blob/main/PRIVACY.md
(a public GitHub file URL is accepted; no GitHub Pages site is required).

## Assets checklist

- [x] 128×128 store icon — `public/icon/128.png` (the final Σ graphite mark; bundled in the build)
- [x] 1280×800 screenshots — `store/screenshots/{chatgpt,claude,gemini,interface}.png`
      (regenerate any time with `pnpm shots` from the raw captures in `docs/screenshots/`)
- [x] 440×280 small promo tile — `store/screenshots/promotitle.png`
- [x] 1400×560 marquee — `store/screenshots/marquee.png`
      (both rendered from the brand SVGs in `store/promo/` via `pnpm promo`)

Screenshot order to upload (best first): `interface.png` (what it is) → `chatgpt.png`
(in action) → `gemini.png`, `claude.png` (works everywhere). The promo tiles
(`marquee.png`, `promotitle.png`) go in the "Graphic assets" section, not "Screenshots".

## Submission steps (Chrome Web Store)

1. Build the package: `pnpm build` then `pnpm zip` → `.output/equapaste-<version>-chrome.zip`.
2. Go to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New item** → upload the zip.
3. **Store listing** tab: paste the Name, Short description, and Detailed description above;
   set Category = Productivity; language = English; upload the four 1280×800 screenshots.
4. **Privacy** tab: single purpose = paste the declaration above; add a justification for each
   permission (text above); set the privacy policy URL; certify the three data-use statements
   ("does not collect user data", not sold, not for unrelated use, not for creditworthiness).
5. **Distribution**: Public, all regions.
6. Submit for review. First review typically takes a few days; you'll get an email.

## Other stores

- **Edge Add-ons:** free; submit the same `.zip` (`pnpm zip`).
- **Firefox AMO:** free; `pnpm zip:firefox` (manifest includes the required gecko id and a
  non-persistent background for Firefox). Provide the source zip (`.output/equapaste-<version>-sources.zip`)
  + build steps (`pnpm install` → `pnpm build:firefox`) if asked.
