import { convertEquation } from '../core/convert';
import { LatexConversionError } from '../core/latex-to-mathml';
import { buildPayload, getTarget, type TargetProfile } from '../core/targets';
import type { TargetId } from '../core/types';
import { writeClipboard } from '../shared/clipboard';
import type { DetectedEquation } from './detect-equations';
import { renderEquationPng } from './render-image';

export interface CopyResult {
  ok: boolean;
  target: TargetProfile;
  /** True when conversion failed and we copied the raw LaTeX instead. */
  fellBackToLatex?: boolean;
  error?: string;
}

/**
 * Convert + write to the clipboard for a target. On a conversion failure we copy
 * the raw LaTeX and tell the user honestly rather than
 * failing silently.
 */
export async function copyEquation(eq: DetectedEquation, targetId: TargetId): Promise<CopyResult> {
  const target = getTarget(targetId);
  try {
    const converted = convertEquation({ latex: eq.latex, display: eq.display });
    const payload = buildPayload(targetId, converted);
    if (typeof console !== 'undefined') {
      const preview = payload['text/plain'] ?? payload['text/html'] ?? '(image)';
      console.debug(`[EquaPaste] copy "${targetId}" →`, preview.slice(0, 90));
    }
    await writeClipboard(payload, (alt) => renderEquationPng(alt, eq.display));
    return { ok: true, target };
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[EquaPaste] copy failed, falling back to raw LaTeX:', err);
    }
    const conversionFailed = err instanceof LatexConversionError;
    // Last-ditch: at least give the user their LaTeX.
    try {
      await writeClipboard({ 'text/plain': eq.latex });
      return { ok: true, target, fellBackToLatex: true };
    } catch {
      return {
        ok: false,
        target,
        error: conversionFailed ? `Couldn't convert this equation` : 'Clipboard write failed',
      };
    }
  }
}
