// Shared types for the pure conversion core. Nothing here touches the DOM,
// chrome.*, or the clipboard — see src/content/* for side effects.

export type TargetId =
  | 'word'
  | 'word-online'
  | 'notion'
  | 'obsidian'
  | 'markdown'
  | 'google-docs'
  | 'plaintext'
  | 'latex'
  | 'mathml';

export interface EquationSource {
  /** Original LaTeX with surrounding delimiters stripped. */
  latex: string;
  /** Block (display) equation vs inline. */
  display: boolean;
}

export interface ConvertedEquation {
  source: EquationSource;
  /** Clean presentation MathML (xmlns set, Temml classes/styles removed). */
  mathml: string;
  /** OMML inner markup: a sequence of `m:*` elements, WITHOUT the oMath wrapper. */
  omml: string;
}

/**
 * What the content layer must place on the clipboard. Text MIME types carry
 * strings; the optional image path tells the content layer to rasterise the
 * equation and attach it as `image/png` (the Google Docs path).
 */
export interface ClipboardPayload {
  'text/plain'?: string;
  'text/html'?: string;
  /** When set: render the equation to a PNG and embed `altLatex` as alt text. */
  imagePng?: { altLatex: string };
}
