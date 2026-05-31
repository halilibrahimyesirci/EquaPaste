// Builds the exact clipboard fragments each target understands. Pure string
// builders only — the content layer turns these into Blobs + ClipboardItem and
// calls navigator.clipboard.write (Chrome requires Blob values).

// IMPORTANT: the CLIPBOARD OMML namespace is the 2004/12 "office/omml" URI that
// Word writes to its own clipboard — NOT the docx 2006/math namespace. Pasting
// the wrong namespace can silently degrade to text/image.
const OMML_CLIPBOARD_NS = 'http://schemas.microsoft.com/office/2004/12/omml';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

/**
 * Word clipboard strategy (the "Word" target only):
 * - `mathml`     — bare Presentation MathML in text/html. Word converts it via
 *                  mml2omml.xsl into a native editable equation. THE working path.
 * - `latex-text` — `$$…$$` only; desktop Word auto-converts via Math AutoCorrect.
 * - `omml-html`  — OMML in HTML. Experimental; Word does NOT import OMML from HTML
 *                  (it's outbound-only), so this usually pastes nothing. Kept for
 *                  troubleshooting (docs/word-clipboard-findings.md).
 */
export type WordStrategy = 'mathml' | 'latex-text' | 'omml-html';

/**
 * Wrap inner OMML in the HTML fragment Word recognises. Display equations use
 * <m:oMathPara>; inline uses a bare <m:oMath>. Chromium auto-prepends the
 * CF_HTML header on Windows — we must NOT hand-roll it.
 */
export function buildWordOmmlHtml(innerOmml: string, display: boolean): string {
  const math = display
    ? `<m:oMathPara><m:oMath>${innerOmml}</m:oMath></m:oMathPara>`
    : `<m:oMath>${innerOmml}</m:oMath>`;
  return (
    `<html xmlns:m="${OMML_CLIPBOARD_NS}" xmlns="${XHTML_NS}">` +
    `<body><!--StartFragment-->${math}<!--EndFragment--></body></html>`
  );
}

/**
 * The text/html value for a MathML clipboard write is just the BARE <math>
 * element — Word's importer looks for the W3C MathML-namespace <math> and adds
 * the CF_HTML wrapper itself. No <html>/<body>/StartFragment wrapper (which can
 * make Word drop the math). cleanMathml() already injects the xmlns.
 */
export function buildMathmlHtml(mathml: string): string {
  return mathml;
}

/**
 * Wrap LaTeX in math delimiters. Inline -> `$…$`. Display -> `$$…$$` on a single
 * line (the form Word auto-converts and most editors accept). Set
 * `blockOnOwnLines` for Obsidian-style blocks that want the `$$` on their own
 * lines for reliable reading-mode rendering.
 */
export function delimitLatex(latex: string, display: boolean, blockOnOwnLines = false): string {
  if (!display) return `$${latex}$`;
  return blockOnOwnLines ? `$$\n${latex}\n$$` : `$$${latex}$$`;
}
