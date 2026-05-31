import { describe, it, expect } from 'vitest';
import { latexToMathml } from '../../src/core/latex-to-mathml';
import { mathmlToOmml } from '../../src/core/mathml-to-omml';

const OMML_NS = 'http://schemas.microsoft.com/office/2004/12/omml';

/** Convert LaTeX straight to OMML for terser tests. */
function omml(latex: string, display = false): string {
  return mathmlToOmml(latexToMathml(latex, display));
}

/** Wrap inner OMML and assert it parses as well-formed namespaced XML. */
function assertWellFormed(inner: string): void {
  const xml = `<m:oMath xmlns:m="${OMML_NS}">${inner}</m:oMath>`;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const err = doc.getElementsByTagName('parsererror');
  expect(err.length, `not well-formed: ${err[0]?.textContent ?? ''}\n${inner}`).toBe(0);
}

describe('mathmlToOmml — structural mapping', () => {
  it('fraction -> m:f / m:num / m:den', () => {
    const out = omml('\\frac{a}{b}');
    expect(out).toContain('<m:f>');
    expect(out).toContain('<m:num>');
    expect(out).toContain('<m:den>');
    expect(out).toContain('<m:t xml:space="preserve">a</m:t>');
    expect(out).toContain('<m:t xml:space="preserve">b</m:t>');
  });

  it('superscript -> m:sSup', () => {
    const out = omml('x^2');
    expect(out).toContain('<m:sSup>');
    expect(out).toContain('<m:sup>');
  });

  it('subscript -> m:sSub', () => {
    expect(omml('x_i')).toContain('<m:sSub>');
  });

  it('sub+superscript -> m:sSubSup', () => {
    expect(omml('x_i^2')).toContain('<m:sSubSup>');
  });

  it('sum with limits -> m:nary (∑, undOvr) consuming its operand', () => {
    const out = omml('\\sum_{i=1}^{N} x_i', true);
    expect(out).toContain('<m:nary>');
    expect(out).toContain('<m:chr m:val="∑"/>');
    expect(out).toContain('<m:limLoc m:val="undOvr"/>');
    // operand (x_i) lives inside the n-ary <m:e>
    expect(out).toMatch(/<m:e><m:sSub>/);
  });

  it('integral with limits -> m:nary (∫, subSup)', () => {
    const out = omml('\\int_0^\\infty f', true);
    expect(out).toContain('<m:chr m:val="∫"/>');
    expect(out).toContain('<m:limLoc m:val="subSup"/>');
  });

  it('square root -> m:rad with hidden degree', () => {
    const out = omml('\\sqrt{2}');
    expect(out).toContain('<m:rad>');
    expect(out).toContain('<m:degHide m:val="1"/>');
  });

  it('nth root -> m:rad with explicit degree', () => {
    const out = omml('\\sqrt[3]{x}');
    expect(out).toContain('<m:degHide m:val="0"/>');
    expect(out).toContain('<m:deg>');
  });

  it('matrix -> m:m / m:mr / m:e', () => {
    const out = omml('\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}', true);
    expect(out).toContain('<m:m>');
    expect(out).toContain('<m:mr>');
    expect((out.match(/<m:mr>/g) ?? []).length).toBe(2);
  });

  it('Greek letters pass through as Unicode runs', () => {
    const out = omml('\\alpha + \\beta');
    expect(out).toContain('α');
    expect(out).toContain('β');
  });

  it('accent (hat) -> m:acc with combining mark', () => {
    const out = omml('\\hat{x}');
    expect(out).toContain('<m:acc>');
    expect(out).toContain('<m:chr m:val="̂"/>'); // U+0302
  });

  it('escapes XML-special characters in runs', () => {
    const out = omml('a < b');
    expect(out).toContain('&lt;');
    expect(out).not.toContain('<m:t xml:space="preserve"><');
  });
});

describe('mathmlToOmml — coverage corpus is always well-formed', () => {
  const corpus: Array<[string, boolean]> = [
    ['x', false],
    ['x^2', false],
    ['x_i', false],
    ['x_i^{2}', false],
    ['\\frac{1}{2}', false],
    ['\\frac{a+b}{c-d}', false],
    ['\\sqrt{2}', false],
    ['\\sqrt[3]{x+1}', false],
    ['\\sum_{i=1}^{N}(Y_i-\\beta_0-\\beta_1 X_i)^2', true],
    ['\\int_0^\\infty e^{-x^2}\\,dx', true],
    ['\\prod_{k=1}^{n} k', true],
    ['\\oint_C f\\,dz', true],
    ['\\alpha\\beta\\gamma\\delta\\epsilon', false],
    ['\\hat{x}', false],
    ['\\bar{y}', false],
    ['\\vec{v}', false],
    ['\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}', true],
    ['\\begin{bmatrix}1&0\\\\0&1\\end{bmatrix}', true],
    ['\\begin{aligned}a&=b\\\\c&=d\\end{aligned}', true],
    ['\\lim_{x\\to 0}\\frac{\\sin x}{x}', true],
    ['\\binom{n}{k}', false],
    ['f(x)=ax^2+bx+c', false],
    ['e^{i\\pi}+1=0', false],
    ['\\frac{\\partial}{\\partial x}\\sum_i a_i', true],
  ];

  for (const [latex, display] of corpus) {
    it(`well-formed: ${latex}`, () => {
      const out = omml(latex, display);
      expect(out.length).toBeGreaterThan(0);
      assertWellFormed(out);
    });
  }
});
