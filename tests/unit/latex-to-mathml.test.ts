import { describe, it, expect } from 'vitest';
import {
  stripDelimiters,
  latexToMathml,
  LatexConversionError,
} from '../../src/core/latex-to-mathml';

describe('stripDelimiters', () => {
  it('strips $$…$$ as display', () => {
    expect(stripDelimiters('$$x^2$$')).toEqual({ latex: 'x^2', display: true });
  });
  it('strips $…$ as inline', () => {
    expect(stripDelimiters('$x^2$')).toEqual({ latex: 'x^2', display: false });
  });
  it('strips \\[…\\] as display and \\(…\\) as inline', () => {
    expect(stripDelimiters('\\[a+b\\]')).toEqual({ latex: 'a+b', display: true });
    expect(stripDelimiters('\\(a+b\\)')).toEqual({ latex: 'a+b', display: false });
  });
  it('leaves bare LaTeX untouched', () => {
    expect(stripDelimiters('  \\frac{a}{b} ')).toEqual({ latex: '\\frac{a}{b}' });
  });
});

describe('latexToMathml', () => {
  it('produces MathML with xmlns and no Temml class/style cruft', () => {
    const mml = latexToMathml('x^2', false);
    expect(mml).toContain('xmlns="http://www.w3.org/1998/Math/MathML"');
    expect(mml).toContain('<msup>');
    expect(mml).not.toContain('class=');
    expect(mml).not.toContain('style=');
  });

  it('marks display equations with display="block"', () => {
    expect(latexToMathml('x', true)).toContain('display="block"');
    expect(latexToMathml('x', false)).not.toContain('display="block"');
  });

  it('drops <mspace> and unwraps <semantics>/<annotation>', () => {
    const mml = latexToMathml('\\sqrt[3]{x}', false);
    expect(mml).not.toContain('<mspace');
    expect(mml).not.toContain('annotation');
    expect(mml).not.toContain('semantics');
  });

  it('strips stray HTML (e.g. the <span/> align leaks) so Word gets clean MathML', () => {
    const mml = latexToMathml('\\begin{align} y &= mx+b \\end{align}', true);
    expect(mml).not.toContain('<span');
    expect(mml).not.toContain('<div');
  });

  it('throws LatexConversionError on invalid input', () => {
    expect(() => latexToMathml('\\frac{', false)).toThrow(LatexConversionError);
  });
});
