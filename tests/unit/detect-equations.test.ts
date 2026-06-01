import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractKatex,
  extractXpm,
  equationFromPoint,
  findEquations,
} from '../../src/content/detect-equations';

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

describe('Google Search "AI Mode" (data-xpm-latex on data-xpm-copy-root)', () => {
  // Google draws its own SVG glyphs; the full LaTeX is on the copy-root wrapper, while
  // each inner <img> carries only a partial fragment (\oint_C, (, P, \,dx, …). We must
  // read the root and ignore the fragments.
  function xpm(full: string, fragments: string[], displayStyle = 'inline'): string {
    const inner = fragments
      .map((f) => `<div><img data-xpm-latex="${f.replace(/"/g, '&quot;')}" /><svg></svg></div>`)
      .join('');
    return `<span data-xpm-copy-root="" data-xpm-latex="${full.replace(/"/g, '&quot;')}" style="display: ${displayStyle}">${inner}</span>`;
  }

  it('reads the full LaTeX from the root, not the partial inner fragments', () => {
    const full = 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2 + (z_2-z_1)^2}';
    document.body.innerHTML = xpm(full, ['d ', '\\hphantom{}= \\sqrt{(x_2-x_1)^2}']);
    const root = document.querySelector('[data-xpm-copy-root]')!;
    const eq = extractXpm(root)!;
    expect(eq.latex).toBe(full);
    expect(eq.display).toBe(false); // wrapper is display:inline
    expect(eq.anchor).toBe(root);
  });

  it('equationFromPoint resolves an inner glyph up to the whole equation', () => {
    const full =
      '\\oint_C (P\\,dx + Q\\,dy) = \\iint_R \\left( \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} \\right) dA';
    document.body.innerHTML = xpm(full, ['\\oint_C ', '(', 'P', '\\,dx ', 'dA']);
    const innerImg = document.querySelector('img[data-xpm-latex]')!; // the partial "\oint_C "
    expect(equationFromPoint(innerImg)?.latex).toBe(full);
  });

  it('findEquations picks up each equation once', () => {
    document.body.innerHTML = xpm('a^2+b^2=c^2', ['a', '^2', '+b']);
    expect(findEquations(document.body).map((e) => e.latex)).toEqual(['a^2+b^2=c^2']);
  });

  it('treats a block (non-inline) wrapper as display', () => {
    document.body.innerHTML = xpm('\\int_0^1 x\\,dx', ['\\int_0^1 '], 'block');
    expect(extractXpm(document.querySelector('[data-xpm-copy-root]')!)!.display).toBe(true);
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
