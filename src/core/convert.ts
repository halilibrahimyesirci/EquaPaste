import type { ConvertedEquation, EquationSource } from './types';
import { latexToMathml } from './latex-to-mathml';
import { mathmlToOmml } from './mathml-to-omml';

/**
 * The whole pipeline: LaTeX -> clean MathML -> OMML.
 *
 * Resilient by design: it NEVER throws. If MathML or OMML conversion fails, the
 * corresponding field is left empty so targets that only need the raw LaTeX
 * (Plain text, LaTeX, Obsidian, …) still work and remain DISTINCT from each
 * other. A previous version threw here, which made every target fall back to the
 * same raw LaTeX. The failure reason is logged for diagnosis.
 */
export function convertEquation(source: EquationSource): ConvertedEquation {
  let mathml = '';
  let omml = '';
  try {
    mathml = latexToMathml(source.latex, source.display);
  } catch (err) {
    warn('LaTeX -> MathML failed', err);
  }
  if (mathml) {
    try {
      omml = mathmlToOmml(mathml);
    } catch (err) {
      warn('MathML -> OMML failed', err);
    }
  }
  return { source, mathml, omml };
}

function warn(msg: string, err: unknown): void {
  if (typeof console !== 'undefined') {
    console.warn(`[EquaPaste] ${msg}:`, err instanceof Error ? err.message : err);
  }
}
