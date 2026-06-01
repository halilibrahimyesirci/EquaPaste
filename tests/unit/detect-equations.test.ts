import { describe, it, expect, beforeEach } from 'vitest';
import { extractKatex, equationFromPoint, findEquations } from '../../src/content/detect-equations';

/** Build KaTeX-shaped markup like ChatGPT/Claude render (with MathML annotation). */
function katex(latex: string, display: boolean): string {
  const inner = `<span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow></mrow><annotation encoding="application/x-tex">${latex}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">render</span></span>`;
  return display ? `<span class="katex-display">${inner}</span>` : inner;
}

/** Build Gemini-shaped markup: html-only KaTeX (no annotation) + data-math wrapper. */
function gemini(latex: string): string {
  return `<div class="math-block" data-math="${latex.replace(/"/g, '&quot;')}"><span class="katex-display"><span class="katex"><span class="katex-html" aria-hidden="true">render</span></span></span></div>`;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('extractKatex', () => {
  it('recovers inline LaTeX and anchors to .katex', () => {
    document.body.innerHTML = katex('x^2', false);
    const node = document.querySelector('.katex')!;
    const eq = extractKatex(node);
    expect(eq).not.toBeNull();
    expect(eq!.latex).toBe('x^2');
    expect(eq!.display).toBe(false);
    expect(eq!.anchor).toBe(node);
  });

  it('recovers display LaTeX and anchors to .katex-display', () => {
    document.body.innerHTML = katex('\\frac{a}{b}', true);
    const node = document.querySelector('.katex')!;
    const eq = extractKatex(node)!;
    expect(eq.latex).toBe('\\frac{a}{b}');
    expect(eq.display).toBe(true);
    expect(eq.anchor).toBe(document.querySelector('.katex-display'));
  });

  it('returns null when no source annotation exists', () => {
    document.body.innerHTML = '<span class="katex"><span class="katex-html">x</span></span>';
    expect(extractKatex(document.querySelector('.katex')!)).toBeNull();
  });
});

describe('Gemini (html-only KaTeX + data-math)', () => {
  it('recovers LaTeX from the data-math wrapper and treats it as display', () => {
    document.body.innerHTML = gemini('q = \\frac{1}{2}\\rho V^2');
    const eq = extractKatex(document.querySelector('.katex')!)!;
    expect(eq.latex).toBe('q = \\frac{1}{2}\\rho V^2');
    expect(eq.display).toBe(true);
    expect(eq.anchor).toBe(document.querySelector('.math-block'));
  });

  it('equationFromPoint resolves it from inside the rendered html', () => {
    document.body.innerHTML = gemini('x^2');
    expect(equationFromPoint(document.querySelector('.katex-html'))?.latex).toBe('x^2');
  });

  it('equationFromPoint resolves it from the .math-block padding (outside .katex)', () => {
    document.body.innerHTML = gemini('a+b');
    expect(equationFromPoint(document.querySelector('.math-block'))?.latex).toBe('a+b');
  });
});

describe('Perplexity & DeepSeek (standard KaTeX, same as ChatGPT/Claude)', () => {
  // Real samples: both render a .katex-display > .katex > .katex-mathml with the
  // application/x-tex annotation — identical to ChatGPT/Claude, so the KaTeX path handles
  // them. DeepSeek adds a `ds-markdown-math` class on the wrapper, which detection ignores.
  it('Perplexity: recovers the full LaTeX and treats it as display', () => {
    const latex = 'd=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2+(z_2-z_1)^2}';
    document.body.innerHTML = katex(latex, true);
    const eq = extractKatex(document.querySelector('.katex')!)!;
    expect(eq.latex).toBe(latex);
    expect(eq.display).toBe(true);
    expect(eq.anchor).toBe(document.querySelector('.katex-display'));
  });

  it('DeepSeek: extra wrapper class does not block detection', () => {
    const latex = "L = \\int_a^b \\|\\mathbf{r}'(t)\\| \\, dt";
    document.body.innerHTML = katex(latex, true).replace(
      'class="katex-display"',
      'class="katex-display ds-markdown-math"',
    );
    const eq = extractKatex(document.querySelector('.katex')!)!;
    expect(eq.latex).toBe(latex);
    expect(eq.display).toBe(true);
    expect(eq.anchor).toBe(document.querySelector('.katex-display'));
  });
});

describe('equationFromPoint', () => {
  it('resolves the equation from a descendant node (whole-block click)', () => {
    document.body.innerHTML = katex('a+b', true);
    const inner = document.querySelector('.katex-html')!;
    const eq = equationFromPoint(inner);
    expect(eq?.latex).toBe('a+b');
  });

  it('returns null for unrelated nodes', () => {
    document.body.innerHTML = '<p id="x">hi</p>';
    expect(equationFromPoint(document.getElementById('x'))).toBeNull();
  });
});

describe('findEquations', () => {
  it('finds each equation once and ignores the nested MathML copy', () => {
    document.body.innerHTML = katex('x', false) + katex('y', true);
    const eqs = findEquations(document.body);
    expect(eqs.map((e) => e.latex).sort()).toEqual(['x', 'y']);
  });
});
