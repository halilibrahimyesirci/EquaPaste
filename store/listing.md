# Chrome Web Store listing (draft)

Copy/paste fields for submission. Keep permissions minimal for fast review.

## Name

EquaPaste — copy AI math into Word

## Short description (≤132 chars)

Copy math from ChatGPT, Claude, Gemini, Perplexity & DeepSeek and paste it as a native, editable Word/Notion equation. 100% local.

## Detailed description

Tired of copying an equation from an AI chat only to watch it turn into broken LaTeX in
Word? EquaPaste fixes that in one click.

Hover any equation in ChatGPT, Claude, Gemini, Perplexity or DeepSeek — the whole block highlights and a Copy button
appears. Click it and the equation lands in your document as a real, editable equation:
native OfficeMath in Word, a math block in Notion, `$$…$$` in Obsidian/Markdown, and more.

• One click, right where you read the answer — no menus, no setup.
• Native, editable results — not screenshots, not raw source code.
• 100% local: no servers, no tracking, no account. Conversion happens in your browser.
• Multiple destinations: Word, Word Online, Notion, Obsidian, GitHub/GitLab Markdown,
  LaTeX, MathML, and Google Docs (as readable Unicode text — x², √, subscripts).
• Light/dark aware, keyboard accessible, open source (MIT).

Honest note: Google Docs has no way to accept a native equation from the clipboard, so
EquaPaste pastes it as readable Unicode text (falling back to LaTeX where no Unicode form exists).

Works today on ChatGPT, Claude, Gemini, Perplexity, and DeepSeek. Microsoft Copilot is planned.

FREQUENTLY ASKED QUESTIONS

How do I copy an equation from ChatGPT into Word?
Hover the equation, click it (or the "Copy to Word" pill), then paste (Ctrl/Cmd+V) into Word. It arrives as a native, editable equation — not text.

Why does math from ChatGPT paste into Word as broken LaTeX (like \frac{a}{b})?
The chat only puts the raw LaTeX source on your clipboard. EquaPaste converts it to MathML, which Word turns into a real OfficeMath equation automatically.

Does it work with Claude, Gemini, Perplexity and DeepSeek?
Yes — the same one-click copy works on all five. Microsoft Copilot is planned.

How do I paste an AI equation into Word Online (Word for the web)?
Paste it as Plain text, or copy it as LaTeX, paste the LaTeX, select it, and use the top Insert > Equation to convert it into a real equation.

Can I copy equations into Notion, Obsidian or Markdown?
Yes. Notion gets a native math block (type /math, then paste); Obsidian and GitHub/GitLab Markdown get $…$ / $$…$$ that renders.

How do I get a ChatGPT equation into Google Docs?
EquaPaste pastes it as readable Unicode text (x², √, subscripts). Google Docs can't accept a native equation from the clipboard.

Can I copy the equation as LaTeX or MathML instead?
Yes — open the menu on the Copy pill and pick LaTeX, MathML, or plain Unicode text.

Is EquaPaste free, private and open source?
Yes. It's MIT-licensed, runs 100% in your browser, and sends nothing anywhere — no servers, no tracking, no account.

## Category

Productivity

## Single-purpose declaration

EquaPaste detects rendered LaTeX/math equations on supported AI chat pages and lets the
user one-click copy them as native, editable equations (or as LaTeX/MathML/Unicode text)
to their clipboard for pasting into document editors. It does no other work.

## Permission justifications

Only two API permissions are requested (plus host access). `activeTab` and `scripting`
are **not** used: the content script is declared statically (`content_scripts`) and runs
under the host permissions below, and keyboard-shortcut commands reach it via host access —
so neither is needed, and requesting them would be an unnecessary permission.

- **clipboardWrite** — Required to write the converted equation (MathML for Word, LaTeX,
  MathML, or Unicode text) to the clipboard when the user clicks Copy or presses the
  shortcut. EquaPaste only writes to the clipboard; it never reads it.
- **storage** — Stores the user's own preferences locally (default paste target, theme,
  enabled platforms, Word output format) via `chrome.storage`. No data leaves the device.
- **Host permissions (chatgpt.com, claude.ai, gemini.google.com, perplexity.ai, chat.deepseek.com)** —
  Limited to the AI chat domains where rendered equations appear, so the content script can
  detect the equation under the cursor and convert it. No broad `<all_urls>` access is requested.

## Data use disclosure

"This extension does not collect user data." Certify the three Limited Use statements:
data is not sold, not used for unrelated purposes, not used for creditworthiness.

Privacy policy URL: https://github.com/halilibrahimyesirci/EquaPaste/blob/main/PRIVACY.md
(a public GitHub file URL is accepted; no GitHub Pages site is required).

## Assets checklist

- [x] 128×128 store icon — `public/icon/128.png` (the final Σ graphite mark; bundled in the build)
- [x] 1280×800 screenshots — `store/screenshots/{chatgpt,claude,gemini,interface}.png`
      (composed from the raw captures in `docs/screenshots/`)
- [x] 440×280 small promo tile — `store/screenshots/promotitle.png`
- [x] 1400×560 marquee — `store/screenshots/marquee.png`
      (both exported from the editable brand SVGs in `store/promo/`)

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
