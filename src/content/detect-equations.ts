// Renderer-first equation detection. We bind to the KaTeX render signature
// rather than per-site CSS classes (those churn), with a thin attribute fallback
// for sites that render KaTeX in HTML-only mode and stash the source elsewhere.
//
// Source-of-LaTeX strategy (in priority order):
//   1. KaTeX MathML annotation `.katex-mathml annotation[encoding="application/x-tex"]`
//      — ChatGPT, Claude, Perplexity & DeepSeek (KaTeX default `htmlAndMathml`).
//   2. A `data-*` attribute on an ancestor — Gemini renders KaTeX html-only and
//      puts the source in `.math-block[data-math]`; also handle data-latex/data-tex.
//   3. `data-xpm-latex` on a `[data-xpm-copy-root]` wrapper — Google Search "AI Mode"
//      draws its own SVG glyphs and stashes the full LaTeX on the root (inner nodes
//      hold only partial fragments, so we read the root element only).

export interface DetectedEquation {
  /** The element the pill/highlight anchors to (the block for display math). */
  anchor: HTMLElement;
  /** Original LaTeX recovered losslessly from the renderer. */
  latex: string;
  /** Display (block) vs inline. */
  display: boolean;
}

const KATEX_TEX_SELECTOR = '.katex-mathml annotation[encoding="application/x-tex"]';
const DATA_ATTRS = ['data-math', 'data-latex', 'data-tex'] as const;
const DATA_SELECTOR = '[data-math],[data-latex],[data-tex]';
const BLOCK_SELECTOR = '.katex-display, .math-block';
// Google Search "AI Mode": the full LaTeX lives on the copy-root wrapper.
const XPM_ROOT_SELECTOR = '[data-xpm-copy-root]';
const XPM_LATEX_ATTR = 'data-xpm-latex';

/** Read source LaTeX from a `data-*` attribute on the element or an ancestor. */
function latexFromDataAttr(el: Element): string {
  const host = el.closest(DATA_SELECTOR);
  if (!host) return '';
  for (const attr of DATA_ATTRS) {
    const v = host.getAttribute(attr);
    if (v && v.trim()) return v.trim();
  }
  return '';
}

/** Extract from a single `.katex` node, or null if its source can't be recovered. */
export function extractKatex(katex: Element): DetectedEquation | null {
  // 1. KaTeX annotation (ChatGPT, Claude). 2. data-* fallback (Gemini).
  let latex = (katex.querySelector(KATEX_TEX_SELECTOR)?.textContent ?? '').trim();
  if (!latex) latex = latexFromDataAttr(katex);
  if (!latex) return null;

  // Anchor to the outermost block wrapper so the whole equation is the hover
  // target: prefer the data-* block (Gemini's .math-block), then .katex-display.
  const anchor = (katex.closest(DATA_SELECTOR) ??
    katex.closest('.katex-display') ??
    katex) as HTMLElement;
  const display = Boolean(katex.closest(BLOCK_SELECTOR));
  return { anchor, latex, display };
}

/** Google "AI Mode": read the complete LaTeX from the `[data-xpm-copy-root]` wrapper. */
export function extractXpm(root: Element): DetectedEquation | null {
  const latex = (root.getAttribute(XPM_LATEX_ATTR) ?? '').trim();
  if (!latex) return null;
  // Google marks inline math with `display: inline` on the wrapper; everything else is block.
  const display = !/^inline/.test((root as HTMLElement).style.display);
  return { anchor: root as HTMLElement, latex, display };
}

/** Resolve the equation anchor for an arbitrary node under the pointer, if any. */
export function equationFromPoint(target: EventTarget | null): DetectedEquation | null {
  if (!(target instanceof Element)) return null;
  const katex = target.closest('.katex');
  if (katex) return extractKatex(katex);
  // Google AI Mode: any inner glyph/img resolves up to the copy-root wrapper.
  const xpmRoot = target.closest(XPM_ROOT_SELECTOR);
  if (xpmRoot) return extractXpm(xpmRoot);
  // Gemini: the pointer may be over the .math-block padding, outside .katex.
  const block = target.closest(DATA_SELECTOR);
  const inner = block?.querySelector('.katex');
  if (inner) return extractKatex(inner);
  return null;
}

/** Find all equations within a subtree (used by the scanner for warm-up). */
export function findEquations(root: ParentNode): DetectedEquation[] {
  const out: DetectedEquation[] = [];
  const seen = new Set<Element>();
  for (const katex of root.querySelectorAll('.katex')) {
    if (katex.closest('.katex-mathml')) continue; // skip the hidden MathML copy
    const eq = extractKatex(katex);
    if (eq && !seen.has(eq.anchor)) {
      seen.add(eq.anchor);
      out.push(eq);
    }
  }
  for (const xpm of root.querySelectorAll(XPM_ROOT_SELECTOR)) {
    const eq = extractXpm(xpm);
    if (eq && !seen.has(eq.anchor)) {
      seen.add(eq.anchor);
      out.push(eq);
    }
  }
  return out;
}
