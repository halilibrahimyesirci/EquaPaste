// Public surface of the pure conversion core.
export type { TargetId, EquationSource, ConvertedEquation, ClipboardPayload } from './types';
export {
  stripDelimiters,
  latexToMathml,
  cleanMathml,
  LatexConversionError,
} from './latex-to-mathml';
export { mathmlToOmml } from './mathml-to-omml';
export { mathmlToUnicode } from './mathml-to-unicode';
export { convertEquation } from './convert';
export {
  buildWordOmmlHtml,
  buildMathmlHtml,
  delimitLatex,
  type WordStrategy,
} from './clipboard-payload';
export {
  TARGETS,
  MVP_TARGET_ORDER,
  PILL_MENU_ORDER,
  getTarget,
  buildPayload,
  setWordStrategy,
  getWordStrategy,
  type TargetProfile,
} from './targets';
