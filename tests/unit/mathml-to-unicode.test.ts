import { describe, it, expect } from 'vitest';
import { latexToMathml } from '../../src/core/latex-to-mathml';
import { mathmlToUnicode } from '../../src/core/mathml-to-unicode';

function u(latex: string, display = false): string {
  return mathmlToUnicode(latexToMathml(latex, display));
}

describe('mathmlToUnicode', () => {
  it('superscript digit: x^2 -> x²', () => {
    expect(u('x^2')).toBe('x²');
  });

  it('subscript: x_i -> xᵢ', () => {
    expect(u('x_i')).toBe('xᵢ');
  });

  it('sub+sup: x_i^2 -> xᵢ²', () => {
    expect(u('x_i^2')).toBe('xᵢ²');
  });

  it('multi-char mapped superscript: a^{n+1} -> aⁿ⁺¹', () => {
    expect(u('a^{n+1}')).toBe('aⁿ⁺¹');
  });

  it('unmapped superscript falls back to ^(...): x^{q} -> x^(q)', () => {
    expect(u('x^{q}')).toBe('x^(q)');
  });

  it('Greek passes through: \\alpha + \\beta -> α+β', () => {
    expect(u('\\alpha + \\beta')).toBe('α+β');
  });

  it('sqrt: \\sqrt{2} -> √2 ; \\sqrt{x+1} -> √(x+1)', () => {
    expect(u('\\sqrt{2}')).toBe('√2');
    expect(u('\\sqrt{x+1}')).toBe('√(x+1)');
  });

  it('fraction: \\frac{a}{b} -> a/b', () => {
    expect(u('\\frac{a}{b}')).toBe('a/b');
  });

  it('hat accent appends a combining mark: \\hat{x}', () => {
    const out = u('\\hat{x}');
    expect(out.startsWith('x')).toBe(true);
    expect(out).toContain('̂'); // combining circumflex
  });

  it('sum with limits is readable and never empty', () => {
    const out = u('\\sum_{i=1}^{N} x_i', true);
    expect(out).toContain('∑');
    expect(out).toContain('xᵢ');
    expect(out.length).toBeGreaterThan(0);
  });

  it('superscript binds only the exponent, not following operators (ρ²sin φ)', () => {
    // Regression: \rho^2\sin\phi must NOT become ρ^(2si)nφ — the ^ binds only "2".
    const out = u('\\rho^2\\sin\\phi');
    expect(out.startsWith('ρ²')).toBe(true);
    expect(out).toContain('sin');
    expect(out).not.toContain('ˢⁱ'); // "si" never lands in a superscript
  });

  it('strips invisible chars (function application / invisible times)', () => {
    const out = u('\\rho^2\\sin\\phi');
    expect(out).not.toContain('⁡');
    expect(out).not.toContain('⁢');
  });

  it('returns empty string for empty input (resilient)', () => {
    expect(mathmlToUnicode('')).toBe('');
  });

  // ---- matrices & alignment (the "&" separator) ----

  it('bare matrix -> bracketed grid: [a, b; c, d]', () => {
    expect(u('\\begin{matrix}a&b\\\\c&d\\end{matrix}', true)).toBe('[a, b; c, d]');
  });

  it('pmatrix uses its own ( ) fence, not a doubled bracket', () => {
    // Regression: was "([a, b; c, d])".
    expect(u('\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}', true)).toBe('(a, b; c, d)');
  });

  it('bmatrix uses its own [ ] fence, not a doubled bracket', () => {
    // Regression: was "[[1, 2; 3, 4]]".
    expect(u('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}', true)).toBe('[1, 2; 3, 4]');
  });

  it('aligned: "&" is alignment, so each line concatenates onto its own row', () => {
    // Regression: was "[a, =b; c, =d]".
    expect(u('\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}', true)).toBe('a=b\nc=d');
  });

  it('align: drops Temml padding cells instead of emitting empty commas', () => {
    // Regression: was "[, y, =mx+b, ]".
    expect(u('\\begin{align} y &= mx+b \\end{align}', true)).toBe('y=mx+b');
  });

  it('cases keeps its { fence and reads as value, condition per row', () => {
    expect(u('f(x) = \\begin{cases} 1 & x \\ge 0 \\\\ 0 & x < 0 \\end{cases}', true)).toBe(
      'f(x)={1, x≥0; 0, x<0',
    );
  });
});
