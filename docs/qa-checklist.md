# EquaPaste — release QA checklist

Run before every store submission. Automated unit tests (`pnpm test`, 90+) cover the
pure conversion core; the checks below are the manual end-to-end paths that only a
human + real target apps can verify. Tick a box only after you actually see the result.

> Build fresh first: `pnpm build`, then in `chrome://extensions` remove any old copy,
> *Load unpacked* → `.output\chrome-mv3`, and reload the chat tab. Confirm the console
> shows `[EquaPaste] ready on <platform> — v<version>`.

## 1. Detection & in-page UX (per platform)

For **each** of ChatGPT, Claude, Gemini, Perplexity, DeepSeek:

- [ ] Hover a **display** equation → whole block highlights + `Σ Copy to Word` pill appears top-right.
- [ ] Hover an **inline** equation → small copy affordance (reading flow not broken).
- [ ] **Click the block** → copies to the default target; pill shows the `∑→✓` confirmation + "Copied to Word".
- [ ] **Caret ▾** opens the format menu (Word / Plain text / LaTeX / MathML); Esc / outside-click closes it.
- [ ] Keyboard: focus an equation, **Alt+Shift+E** copies default, **Alt+Shift+L** copies LaTeX.
- [ ] **Light/dark**: on a dark message surface the pill flips theme; on light it stays light.
- [ ] **Streaming**: ask for a new equation; while it streams no duplicate pills appear, and one settles when done.
- [ ] **SPA nav**: switch conversations / open a new chat — pills attach to new equations, none orphaned.
- [ ] **No layout shift**: the page never reflows when a pill appears.

## 2. Conversion correctness (paste into the real target)

Copy each equation type and paste into the target; confirm the **expected result**.

Equation corpus (have one of each handy in a chat):
`x_i^2` · `\frac{a}{b}` · `\sqrt[3]{x+1}` · `\sum_{i=1}^{N} a_i` · `\int_0^\infty e^{-x^2}\,dx`
· `\hat{x}+\bar{y}` · `\alpha\beta\gamma` · `\begin{pmatrix}a&b\\c&d\end{pmatrix}`
· `\begin{aligned} a &= b \\ c &= d \end{aligned}` · `\begin{cases}1&x>0\\0&x\le0\end{cases}`

| Target | How to paste | Expected | OK? |
|---|---|---|---|
| **Word (desktop)** | Ctrl/Cmd+V | Native, **editable** equation (all types incl. matrix/aligned) | ☐ |
| **Word Online** | Insert → Equation (Alt+=), then paste `$…$` | Renders in the equation field | ☐ |
| **Notion** | type `/math` → paste | Native math block renders | ☐ |
| **Obsidian** | paste in a note | `$…$` / `$$…$$` renders | ☐ |
| **GitHub/GitLab Markdown** | paste in a comment/`.md` preview | Math renders | ☐ |
| **Google Docs** | paste | Unicode plain text (x², √, αβ; matrices `(a, b; c, d)`, aligned line-per-row) | ☐ |
| **Plain text** (menu) | paste anywhere plain | Unicode glyphs, no `$` or raw LaTeX | ☐ |
| **LaTeX** (menu) | paste anywhere plain | Raw LaTeX source | ☐ |
| **MathML** (menu) | paste anywhere plain | `<math …>` source | ☐ |

Focus the fragile cases: **sum/int with limits**, **matrix**, **aligned/cases** — these were the
historical break points. Plain-text matrices must use their own fence once (e.g. `(a, b; c, d)`,
not `([a, b])`), and aligned lines must read `a=b` / `c=d`, not `[a, =b; …]`.

## 3. Extension surfaces

- [ ] **Onboarding** (opens on install): hero, sample `E=mc²` with a working pill, 3 steps, target chips.
- [ ] **Popup**: master on/off, default-target dropdown, shortcut + Change link, active-platform chips (ChatGPT/Claude/Gemini), `🔒 No servers · No tracking` badge, version string.
- [ ] **Options**: theme Auto/Light/Dark, per-target toggles, privacy card, about/version.
- [ ] Settings **persist** after closing/reopening the browser.

## 4. Privacy / store hygiene

- [ ] DevTools **Network** tab shows **zero** outbound requests during copy.
- [ ] Manifest permissions are minimal (`clipboardWrite`, `storage`, `activeTab`, `scripting`) and host permissions only the three chat domains.
- [ ] `pnpm zip` and `pnpm zip:firefox` both produce a clean package.
