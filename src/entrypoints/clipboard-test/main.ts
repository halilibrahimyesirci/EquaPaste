// Word clipboard test harness.
// A real, clickable page to settle the project's #1 risk: which clipboard format
// makes desktop Word / Word Online paste a NATIVE, EDITABLE equation. Open it at
// chrome-extension://<id>/clipboard-test.html, copy each format, paste into Word,
// and record results in docs/word-clipboard-findings.md.
import { convertEquation } from '../../core/convert';
import { buildWordOmmlHtml, buildMathmlHtml } from '../../core/clipboard-payload';
import { LatexConversionError } from '../../core/latex-to-mathml';
import { writeClipboard } from '../../shared/clipboard';
import type { ClipboardPayload } from '../../core/types';

const PRESETS = [
  '\\frac{a}{b}',
  'x_i^2',
  '\\sqrt[3]{x+1}',
  '\\sum_{i=1}^{N}(Y_i-\\beta_0-\\beta_1 X_i)^2',
  '\\int_0^\\infty e^{-x^2}\\,dx',
  '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}',
  '\\hat{x}+\\bar{y}',
  'e^{i\\pi}+1=0',
];

const app = document.getElementById('app')!;
app.innerHTML = `
  <h1>EquaPaste — Word clipboard test harness</h1>
  <p class="lede">Pick a LaTeX equation, copy it in each format, then paste into Word
  (desktop &amp; online) and note which gives a <strong>native, editable</strong> equation.
  Findings go in <code>docs/word-clipboard-findings.md</code>.</p>

  <div class="card">
    <label for="latex">LaTeX</label>
    <textarea id="latex" rows="2">\\sum_{i=1}^{N}(Y_i-\\beta_0-\\beta_1 X_i)^2</textarea>
    <div class="row chips" id="presets"></div>
    <fieldset>
      <legend>Mode</legend>
      <label style="text-transform:none"><input type="radio" name="mode" value="block" checked /> Display (block)</label>
      <label style="text-transform:none"><input type="radio" name="mode" value="inline" /> Inline</label>
    </fieldset>
  </div>

  <div class="card">
    <div class="row">
      <button class="primary" data-fmt="omml-html">Copy ① OMML-in-HTML</button>
      <button data-fmt="mathml-html">Copy ② MathML-in-HTML</button>
      <button data-fmt="mathml-text">Copy ③ MathML (text)</button>
      <button data-fmt="latex-text">Copy ④ LaTeX (text)</button>
    </div>
    <div class="status" id="status" role="status" aria-live="polite"></div>
  </div>

  <div class="card">
    <label>Payload preview</label>
    <pre id="preview"></pre>
  </div>
`;

const latexEl = app.querySelector<HTMLTextAreaElement>('#latex')!;
const statusEl = app.querySelector<HTMLDivElement>('#status')!;
const previewEl = app.querySelector<HTMLPreElement>('#preview')!;
const presetsEl = app.querySelector<HTMLDivElement>('#presets')!;

for (const p of PRESETS) {
  const b = document.createElement('button');
  b.textContent = p.length > 28 ? p.slice(0, 27) + '…' : p;
  b.title = p;
  b.addEventListener('click', () => {
    latexEl.value = p;
    refreshPreview();
  });
  presetsEl.appendChild(b);
}

function isDisplay(): boolean {
  return app.querySelector<HTMLInputElement>('input[name="mode"]:checked')!.value === 'block';
}

type Fmt = 'omml-html' | 'mathml-html' | 'mathml-text' | 'latex-text';

function buildFor(fmt: Fmt): { payload: ClipboardPayload; preview: string } {
  const display = isDisplay();
  const latex = latexEl.value.trim();
  if (fmt === 'latex-text') {
    return { payload: { 'text/plain': latex }, preview: latex };
  }
  const eq = convertEquation({ latex, display });
  switch (fmt) {
    case 'omml-html': {
      const html = buildWordOmmlHtml(eq.omml, display);
      return { payload: { 'text/html': html, 'text/plain': eq.mathml }, preview: html };
    }
    case 'mathml-html': {
      const html = buildMathmlHtml(eq.mathml);
      return { payload: { 'text/html': html, 'text/plain': eq.mathml }, preview: html };
    }
    case 'mathml-text':
      return { payload: { 'text/plain': eq.mathml }, preview: eq.mathml };
  }
}

function setStatus(msg: string, kind: 'ok' | 'err' | '' = ''): void {
  statusEl.textContent = msg;
  statusEl.className = `status ${kind}`;
}

function refreshPreview(): void {
  try {
    const active = (app.querySelector<HTMLButtonElement>('button[data-fmt].primary') ??
      app.querySelector<HTMLButtonElement>('button[data-fmt]'))!;
    previewEl.textContent = buildFor(active.dataset.fmt as Fmt).preview;
  } catch (err) {
    previewEl.textContent =
      err instanceof LatexConversionError ? `LaTeX error: ${err.message}` : String(err);
  }
}

app.querySelectorAll<HTMLButtonElement>('button[data-fmt]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const fmt = btn.dataset.fmt as Fmt;
    try {
      const { payload, preview } = buildFor(fmt);
      previewEl.textContent = preview;
      await writeClipboard(payload);
      setStatus(`✓ Copied format "${fmt}". Now paste into Word.`, 'ok');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`✗ ${msg}`, 'err');
    }
  });
});

latexEl.addEventListener('input', refreshPreview);
app
  .querySelectorAll('input[name="mode"]')
  .forEach((el) => el.addEventListener('change', refreshPreview));
refreshPreview();
