import { describe, it, expect, afterEach } from 'vitest';
import { convertEquation } from '../../src/core/convert';
import {
  buildPayload,
  MVP_TARGET_ORDER,
  PILL_MENU_ORDER,
  TARGETS,
  setWordStrategy,
} from '../../src/core/targets';

const eq = convertEquation({ latex: '\\frac{a}{b}', display: true });
const inline = convertEquation({ latex: 'x^2', display: false });

afterEach(() => setWordStrategy('mathml'));

describe('buildPayload — Word', () => {
  it('default (mathml) sends BARE Presentation MathML in text/html + $$ fallback', () => {
    const p = buildPayload('word', eq);
    expect(p['text/html']).toContain('<math');
    expect(p['text/html']).toContain('xmlns="http://www.w3.org/1998/Math/MathML"');
    // bare element — no <html>/<body>/OMML wrappers (Word's importer wants this)
    expect(p['text/html']).not.toContain('<html');
    expect(p['text/html']).not.toContain('m:oMath');
    expect(p['text/plain']).toBe('$$\\frac{a}{b}$$');
  });

  it('latex-text strategy switches the Word payload to $$…$$ text only', () => {
    setWordStrategy('latex-text');
    const p = buildPayload('word', eq);
    expect(p['text/html']).toBeUndefined();
    expect(p['text/plain']).toBe('$$\\frac{a}{b}$$');
  });

  it('omml-html strategy is still available (experimental)', () => {
    setWordStrategy('omml-html');
    expect(buildPayload('word', eq)['text/html']).toContain('m:oMath');
  });
});

describe('buildPayload — text targets', () => {
  it('LaTeX target copies the raw source (no delimiters)', () => {
    expect(buildPayload('latex', eq)['text/plain']).toBe('\\frac{a}{b}');
  });

  it('Plain text is Unicode: x^2 -> x²', () => {
    expect(buildPayload('plaintext', inline)['text/plain']).toBe('x²');
  });

  it('Plain text falls back to LaTeX when Unicode cannot represent it (fractions)', () => {
    // a/b has no linear Unicode form -> readable (a)/(b)-style or $$ fallback, never empty
    expect(buildPayload('plaintext', eq)['text/plain']).toBeTruthy();
  });

  it('Obsidian block math uses $$ on its own lines', () => {
    expect(buildPayload('obsidian', eq)['text/plain']).toBe('$$\n\\frac{a}{b}\n$$');
  });

  it('Markdown inline uses single $', () => {
    expect(buildPayload('markdown', inline)['text/plain']).toBe('$x^2$');
  });

  it('Notion copies bare LaTeX (UX drives /math)', () => {
    expect(buildPayload('notion', eq)['text/plain']).toBe('\\frac{a}{b}');
  });

  it('Google Docs pastes Unicode text (Docs can’t render via clipboard)', () => {
    const p = buildPayload('google-docs', inline);
    expect(p['text/plain']).toBe('x²');
    expect(p.imagePng).toBeUndefined();
  });
});

describe('MathML target', () => {
  it('emits bare MathML in both text/plain and text/html', () => {
    const p = buildPayload('mathml', eq);
    expect(p['text/plain']).toContain('<math');
    expect(p['text/html']).toContain('<math');
    expect(p['text/html']).not.toContain('<html');
  });
});

describe('target catalogue', () => {
  it('every MVP target has a profile and confidence', () => {
    for (const id of MVP_TARGET_ORDER) {
      expect(TARGETS[id]).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(TARGETS[id].confidence);
    }
  });

  it('pill menu items are all valid distinct targets', () => {
    expect(new Set(PILL_MENU_ORDER).size).toBe(PILL_MENU_ORDER.length);
    for (const id of PILL_MENU_ORDER) expect(TARGETS[id]).toBeDefined();
  });
});
