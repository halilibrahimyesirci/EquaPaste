<div align="center">

# Σ EquaPaste

**Copy the math from ChatGPT, Claude, Gemini, Perplexity & DeepSeek — paste it as a _real, editable_ equation.**

🔒 **No servers · No tracking · Open source** — everything runs in your browser.

</div>

---

AI chats render beautiful math, but the moment you paste it into Word it turns into
broken raw LaTeX. EquaPaste fixes that loop: hover any equation, click once, and it
lands in your document as a **native, editable equation** — not a screenshot, not source code.

<p align="center">
  <img src="docs/screenshots/chatgpt.png" alt="EquaPaste: an equation highlighted in ChatGPT with a “Copy to Word” pill" width="760">
  <br>
  <em>Hover any equation in ChatGPT — the whole block highlights and a <strong>Σ Copy to Word</strong> pill appears.</em>
</p>

## How it works

1. Hover (or focus) an equation in ChatGPT, Claude, Gemini, Perplexity or DeepSeek — the whole block highlights and a **Copy** pill appears.
2. Click anywhere on the equation, or the pill, to copy to your default target (Word by default).
3. Paste. Use the **▾** menu to pick a different format or target.

No setup, no account, no network calls. The LaTeX → MathML → OMML conversion happens
entirely on your device.

## Screenshots

The same one-click copy works across every supported chat:

<table>
  <tr>
    <td width="50%" valign="top" align="center">
      <img src="docs/screenshots/claude.png" alt="EquaPaste working on a Claude conversation" width="100%">
      <br><sub><strong>Claude</strong></sub>
    </td>
    <td width="50%" valign="top" align="center">
      <img src="docs/screenshots/gemini.png" alt="EquaPaste working on a Gemini conversation" width="100%">
      <br><sub><strong>Gemini</strong></sub>
    </td>
  </tr>
</table>

The first-run onboarding and the toolbar popup — pick a default target, see which chats
are active, and confirm everything stays on your device:

<p align="center">
  <img src="docs/screenshots/interface.png" alt="EquaPaste onboarding page and toolbar popup" width="820">
</p>

## Supported targets

| Target | Result | Reliability |
|---|---|---|
| **Microsoft Word** (desktop) | Native, editable equation | High |
| **Notion** | Native math block (type `/math`, then paste) | Good |
| **Obsidian / Markdown** (GitHub, GitLab) | `$…$` / `$$…$$`, renders natively | High |
| **LaTeX / MathML** | Raw source | High |
| **Word Online** | Best-effort (LaTeX fallback / open in desktop) | Limited |
| **Google Docs** | Readable **Unicode text** (x², √, α) — native equations aren't possible via clipboard | Limited |

> **Honest note on Google Docs:** Google Docs cannot accept a native equation from the
> clipboard — there is no API for it. EquaPaste pastes the equation as readable Unicode text
> (x², √, subscripts), falling back to LaTeX for structures with no Unicode form. We will never claim otherwise.

Input platforms in this release: **ChatGPT**, **Claude**, **Gemini**, **Perplexity** and
**DeepSeek**. Microsoft Copilot and more are planned.

## Install

**From a store:** _coming soon_ (Chrome Web Store, then Edge Add-ons & Firefox AMO).

**From source (development):**

```bash
pnpm install
pnpm dev            # launches Chrome with hot-reload
# or build an unpacked extension:
pnpm build          # outputs .output/chrome-mv3
```

Then load `.output/chrome-mv3` via `chrome://extensions` → *Load unpacked*.

## FAQ

**How do I copy an equation from ChatGPT into Word?**
Hover the equation, click it (or the “Σ Copy to Word” pill), then paste (Ctrl/⌘V) into Word — it arrives as a native, editable equation, not text.

**Why does math from ChatGPT paste into Word as broken LaTeX like `\frac{a}{b}`?**
The chat only puts the raw LaTeX source on your clipboard. EquaPaste converts it to MathML, which Word turns into a real OfficeMath equation automatically.

**Does it work with Claude, Gemini, Perplexity and DeepSeek too?**
Yes — the same one-click copy works on all five. Microsoft Copilot is planned.

**How do I paste an AI equation into Word Online (Word for the web)?**
Paste it as Plain text, or copy it as LaTeX, paste the LaTeX, select it, and use the top **Insert ▸ Equation** to convert it into a real equation.

**Can I copy equations into Notion, Obsidian or Markdown?**
Yes. Notion gets a native math block (type `/math`, then paste); Obsidian and GitHub/GitLab Markdown get `$…$` / `$$…$$` that renders.

**How do I get a ChatGPT equation into Google Docs?**
EquaPaste pastes it as readable Unicode text (x², √, subscripts). Google Docs can’t accept a native equation from the clipboard.

**Can I copy the equation as LaTeX or MathML instead?**
Yes — open the **▾** menu on the pill and pick LaTeX, MathML, or plain Unicode text.

**Is EquaPaste free, private and open source?**
Yes. It’s MIT-licensed, runs 100% in your browser, and sends nothing anywhere — no servers, no tracking, no account.

## Privacy

EquaPaste collects **nothing**. No analytics, no telemetry, no account, no external
requests. It only reads the rendered equation under your cursor on supported pages and
writes to your clipboard when you click. See [PRIVACY.md](PRIVACY.md).

## Tech

TypeScript · [WXT](https://wxt.dev) (Manifest V3) · [Temml](https://temml.org) for
LaTeX → MathML · a clean-room MIT MathML → OMML converter · shadow-DOM UI · Vitest + Playwright.

How Word receives a native equation (bare Presentation MathML on the clipboard) is
documented in [docs/word-clipboard-findings.md](docs/word-clipboard-findings.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

## Author

Made by **Halil İbrahim Yesirci** — [@halilibrahimyesirci](https://github.com/halilibrahimyesirci).

## License

[MIT](LICENSE) © 2026 Halil İbrahim Yesirci.
