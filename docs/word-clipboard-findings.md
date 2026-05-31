# Word clipboard findings

> **Status:** ✅ RESOLVED. Desktop Word paste confirmed working on a real machine.
>
> **Winner:** Word reads **bare Presentation MathML** (`<math xmlns="http://www.w3.org/1998/Math/MathML">`)
> from `text/html` and converts it to a native, editable equation via `mml2omml.xsl`.
> Word does **not** import OMML from HTML (OMML is outbound-only), which is why our
> earlier `<m:oMath>` payload pasted nothing. Default is now `wordStrategy: 'mathml'`
> (bare MathML in `text/html` + `$$…$$` in `text/plain`). Word Online does not convert
> math pasted into the body — insert an equation (Alt+=) first, then paste.
>
> **Also fixed:** the bundler (Vite 8/rolldown) corrupted Temml's lexer surrogate
> regex (`\uD800…` → `�`), which made `\int`/`\sqrt`/matrices fail to tokenize.
> Repaired on disk in `scripts/ascii-escape.mjs` (run from the `build:done` hook).

## Why this exists

It is **not proven** that writing OMML-in-HTML to the clipboard makes Word paste a
_native, editable_ equation — Microsoft documents that format as what Word _writes_,
not necessarily what it _reads_ from a third-party source. A simpler path (raw
MathML as `text/plain`) is known to produce editable equations in at least one
shipping extension. So we measure all candidates on real Word before committing.

## How to run

1. `pnpm dev` (or `pnpm build` then load `.output/chrome-mv3` as an unpacked extension).
2. Open `chrome-extension://<EXTENSION_ID>/clipboard-test.html`.
3. Pick an equation + mode, click a **Copy ①–④** button, then `Ctrl/Cmd+V` into Word.
4. Record the result in the matrix below.

## Candidate formats

| #   | Name          | What goes on the clipboard                                                                       |
| --- | ------------- | ------------------------------------------------------------------------------------------------ |
| ①   | `omml-html`   | `text/html` = OMML wrapped in `<m:oMathPara>/<m:oMath>` (2004/12/omml ns); `text/plain` = MathML |
| ②   | `mathml-html` | `text/html` = `<math>` MathML in a minimal HTML fragment; `text/plain` = MathML                  |
| ③   | `mathml-text` | `text/plain` = raw MathML only                                                                   |
| ④   | `latex-text`  | `text/plain` = raw LaTeX (Word 365 Alt+= path)                                                   |

Result legend: ✅ native editable equation · 🖼️ pasted as image · 📝 literal text · ❌ nothing/garbage

## Result matrix

Test at least: a fraction, `x_i^2`, an nth root, a **sum with limits**, an **integral
with limits**, a **matrix**, and an accent (`\hat{x}`). Limits/matrices are the most
likely failure points.

### Windows — Word 365 (desktop)

| Equation                               | ① omml-html | ② mathml-html | ③ mathml-text | ④ latex-text |
| -------------------------------------- | ----------- | ------------- | ------------- | ------------ |
| `\frac{a}{b}`                          |             |               |               |              |
| `x_i^2`                                |             |               |               |              |
| `\sqrt[3]{x+1}`                        |             |               |               |              |
| `\sum_{i=1}^{N}(...)^2`                |             |               |               |              |
| `\int_0^\infty e^{-x^2}\,dx`           |             |               |               |              |
| `\begin{pmatrix}a&b\\c&d\end{pmatrix}` |             |               |               |              |
| `\hat{x}+\bar{y}`                      |             |               |               |              |

### Windows — Word 2021 (desktop)

_(repeat)_

### macOS — Word (desktop)

_(repeat)_

### Word for the web (Word Online)

_(repeat — expected weakest; note whether Alt+= then paste works)_

## Decision

- **Winning default strategy:** _TBD_
- **Per-version overrides / caveats:** _TBD_
- **Word Online behaviour:** _TBD_
- **Confidence-copy wording check:** only claim "editable equation" in the UI for
  versions where ✅ was observed; otherwise soften the message.

## Action

Set the default in `src/core/clipboard-payload.ts` (`WordStrategy`) and
`src/core/targets.ts` (`wordStrategy` initial value).
