import type { ClipboardPayload, ConvertedEquation, TargetId } from './types';
import { buildWordOmmlHtml, delimitLatex, type WordStrategy } from './clipboard-payload';
import { mathmlToUnicode } from './mathml-to-unicode';

export interface TargetProfile {
  id: TargetId;
  /** Full name (popup / options). */
  label: string;
  /** Short verb label for the pill / menu, e.g. "Word", "LaTeX". */
  menuLabel: string;
  /** How reliable the result is, surfaced honestly in the UI. */
  confidence: 'high' | 'medium' | 'low';
  /** One-line honest note shown in settings / on hover. */
  note?: string;
  build(eq: ConvertedEquation): ClipboardPayload;
}

// The Word clipboard strategy is module state so the options page can flip it.
// Default matches DEFAULT_SETTINGS.wordStrategy. Affects only the "Word" target.
let wordStrategy: WordStrategy = 'mathml';
export function setWordStrategy(strategy: WordStrategy): void {
  wordStrategy = strategy;
}
export function getWordStrategy(): WordStrategy {
  return wordStrategy;
}

function buildWord(eq: ConvertedEquation): ClipboardPayload {
  const latexText = delimitLatex(eq.source.latex, eq.source.display);
  switch (wordStrategy) {
    case 'latex-text':
      return { 'text/plain': latexText };
    case 'omml-html':
      // Experimental. Word does NOT import OMML from HTML, so this usually pastes
      // nothing; kept only for troubleshooting unusual Word builds.
      return { 'text/html': buildWordOmmlHtml(eq.omml, eq.source.display), 'text/plain': latexText };
    case 'mathml':
    default:
      // Bare Presentation MathML: Word converts it (mml2omml.xsl) into a NATIVE,
      // editable equation on paste. text/plain carries $$…$$ for Word Online's
      // equation field and as a universal fallback. (See docs/word-clipboard-findings.md.)
      return { 'text/html': eq.mathml, 'text/plain': latexText };
  }
}

/** Plain text: real Unicode (x², √, α); falls back to $$…$$ when conversion is empty. */
function buildUnicode(eq: ConvertedEquation): ClipboardPayload {
  const text = mathmlToUnicode(eq.mathml) || delimitLatex(eq.source.latex, eq.source.display);
  return { 'text/plain': text };
}

export const TARGETS: Record<TargetId, TargetProfile> = {
  word: {
    id: 'word',
    label: 'Microsoft Word',
    menuLabel: 'Word',
    confidence: 'high',
    note: 'Native, editable equation in desktop Word. In Word Online, insert an equation (Alt+=) first, then paste.',
    build: buildWord,
  },
  'word-online': {
    id: 'word-online',
    label: 'Word for the web',
    menuLabel: 'Word Online',
    confidence: 'low',
    note: 'Insert an equation first (Alt+=), then paste — Word Online won’t convert math pasted into the body.',
    build: (eq) => ({ 'text/html': eq.mathml, 'text/plain': delimitLatex(eq.source.latex, eq.source.display) }),
  },
  notion: {
    id: 'notion',
    label: 'Notion',
    menuLabel: 'Notion',
    confidence: 'medium',
    note: 'In Notion: type /math (or Ctrl/Cmd+Shift+E), then paste.',
    build: (eq) => ({ 'text/plain': eq.source.latex }),
  },
  obsidian: {
    id: 'obsidian',
    label: 'Obsidian',
    menuLabel: 'Obsidian',
    confidence: 'high',
    note: 'Pastes as $…$ / $$…$$ (block on its own lines) and renders via MathJax.',
    build: (eq) => ({ 'text/plain': delimitLatex(eq.source.latex, eq.source.display, true) }),
  },
  markdown: {
    id: 'markdown',
    label: 'Markdown (GitHub / GitLab)',
    menuLabel: 'Markdown',
    confidence: 'high',
    note: 'Inline $…$ / block $$…$$. GitLab uses KaTeX (a LaTeX subset).',
    build: (eq) => ({ 'text/plain': delimitLatex(eq.source.latex, eq.source.display) }),
  },
  'google-docs': {
    id: 'google-docs',
    label: 'Google Docs',
    menuLabel: 'Google Docs',
    confidence: 'medium',
    note: 'Click into your doc first, then paste. Docs can’t render native math from the clipboard — pastes as readable Unicode text.',
    build: buildUnicode,
  },
  plaintext: {
    id: 'plaintext',
    label: 'Plain text (Unicode)',
    menuLabel: 'Plain text',
    confidence: 'medium',
    note: 'Readable Unicode — x², √, α, subscripts. Structures with no Unicode form fall back to LaTeX.',
    build: buildUnicode,
  },
  latex: {
    id: 'latex',
    label: 'LaTeX source (raw)',
    menuLabel: 'LaTeX',
    confidence: 'high',
    note: 'Raw LaTeX with no delimiters.',
    build: (eq) => ({ 'text/plain': eq.source.latex }),
  },
  mathml: {
    id: 'mathml',
    label: 'MathML',
    menuLabel: 'MathML',
    confidence: 'high',
    note: 'Presentation MathML markup.',
    build: (eq) => ({ 'text/plain': eq.mathml, 'text/html': eq.mathml }),
  },
};

/** Full catalogue offered as selectable default targets (popup / options). */
export const MVP_TARGET_ORDER: TargetId[] = [
  'word',
  'plaintext',
  'latex',
  'mathml',
  'notion',
  'obsidian',
  'markdown',
  'google-docs',
  'word-online',
];

/**
 * Quick-actions shown in the in-page pill menu — kept to GENUINELY DISTINCT
 * clipboard formats (native MathML / Unicode text / raw LaTeX / MathML markup) so
 * picking one does something different from the others. Destination targets stay
 * selectable as the default in settings; the controller prepends the current
 * default here if it isn't already listed.
 */
export const PILL_MENU_ORDER: TargetId[] = ['word', 'plaintext', 'latex', 'mathml'];

export function getTarget(id: TargetId): TargetProfile {
  return TARGETS[id];
}

export function buildPayload(id: TargetId, eq: ConvertedEquation): ClipboardPayload {
  return TARGETS[id].build(eq);
}
