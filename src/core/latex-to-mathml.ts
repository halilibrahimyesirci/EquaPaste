import temml from 'temml';
import { parseXml, serializeXml } from './xml';

const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

export interface NormalizedLatex {
  latex: string;
  /** Inferred from delimiters when present; otherwise undefined (caller decides). */
  display?: boolean;
}

// Ordered longest-first so $$ wins over $ and \[ over \(.
const DELIMITERS: Array<{ re: RegExp; display: boolean }> = [
  { re: /^\$\$([\s\S]*)\$\$$/, display: true },
  { re: /^\\\[([\s\S]*)\\\]$/, display: true },
  { re: /^\\\(([\s\S]*)\\\)$/, display: false },
  { re: /^\$([\s\S]*)\$$/, display: false },
];

/**
 * Strip a single surrounding math delimiter pair, if any. AI chats usually hand
 * us bare LaTeX (from the KaTeX annotation), but be defensive.
 */
export function stripDelimiters(input: string): NormalizedLatex {
  const trimmed = input.trim();
  for (const { re, display } of DELIMITERS) {
    const m = re.exec(trimmed);
    if (m && m[1] !== undefined) return { latex: m[1].trim(), display };
  }
  return { latex: trimmed };
}

export class LatexConversionError extends Error {
  override name = 'LatexConversionError';
}

/**
 * Convert LaTeX to clean presentation MathML via Temml.
 * Throws LatexConversionError on invalid input so callers can fall back to
 * copying the raw LaTeX (graceful degradation).
 */
export function latexToMathml(latex: string, display: boolean): string {
  let raw: string;
  try {
    raw = temml.renderToString(latex, { displayMode: display, throwOnError: true });
  } catch (err) {
    throw new LatexConversionError(err instanceof Error ? err.message : String(err));
  }
  return cleanMathml(raw, display);
}

const DROP_ATTRS = new Set(['class', 'style']);

/**
 * Remove Temml's presentational cruft (class/style, decorative <mspace>),
 * unwrap <semantics>/<annotation>, and guarantee xmlns + display so the MathML
 * is portable (Word import + the `mathml` clipboard format).
 */
export function cleanMathml(mathml: string, display: boolean): string {
  const root = parseXml(mathml);
  scrub(root);
  root.setAttribute('xmlns', MATHML_NS);
  if (display) root.setAttribute('display', 'block');
  else root.removeAttribute('display');
  // Strip zero-width / thin-space characters: Word's mml2omml is happier and we
  // avoid spurious spaces in the pasted equation.
  return serializeXml(root).replace(/[\u200B-\u200D\uFEFF\u2009\u200A]/g, '');
}

function scrub(el: Element): void {
  // Depth-first; collect removals so we don't mutate while iterating.
  const toRemove: Element[] = [];
  const toUnwrap: Element[] = [];

  const visit = (node: Element): void => {
    for (const attr of [...node.attributes]) {
      if (DROP_ATTRS.has(attr.name)) node.removeAttribute(attr.name);
    }
    const tag = node.localName;
    if (tag === 'mspace' || tag === 'annotation' || tag === 'annotation-xml') {
      toRemove.push(node);
      return; // don't descend
    }
    if (tag === 'semantics') toUnwrap.push(node);
    for (const child of [...node.children]) visit(child);
  };
  visit(el);

  for (const node of toRemove) node.remove();
  // Unwrap <semantics>: keep only its first (presentation) child.
  for (const node of toUnwrap) {
    const keep = node.children[0];
    if (keep && node.parentNode) node.parentNode.replaceChild(keep, node);
    else node.remove();
  }
}
