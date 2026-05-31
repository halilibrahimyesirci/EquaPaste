// MathML -> Unicode plain text. Renders an equation using real Unicode glyphs
// (x² , √, α, ∑, subscripts/superscripts) instead of LaTeX source — the "Plain
// text" the user wants. Greek letters and operators already arrive as literal
// Unicode from Temml, so only scripts / fractions / roots / accents need work.
// Mirrors the recursive walker in mathml-to-omml.ts. Best-effort: structures with
// no Unicode form (fractions, matrices) degrade to a readable textual form, and
// unmappable scripts fall back to ^(...) / _(...). Never throws.

import { parseXml } from './xml';

// Superscript glyphs. 'q' has no superscript; unmapped chars trigger the ^(...) fallback.
const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ',
  k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ',
  v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
};

// Subscript glyphs (sparser — many letters have none).
const SUBSCRIPT: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ',
  p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
};

// Over-accent operator char -> combining mark appended after the base.
const ACCENTS: Record<string, string> = {
  '^': '̂', ˆ: '̂', '~': '̃', '˜': '̃', '¯': '̄', '‾': '̅',
  '→': '⃗', '⃗': '⃗', '.': '̇', '˙': '̇', '´': '́', '`': '̀',
};

// Invisible operators Temml inserts (function application, invisible times, etc.)
// plus zero-width chars — strip them so the plain text reads cleanly. Built as an
// alternation of \u escapes (a char class would trip no-misleading-character-class).
const INVISIBLE = new RegExp(
  [0x2061, 0x2062, 0x2063, 0x2064, 0x200b, 0x200c, 0x200d, 0xfeff]
    .map((c) => '\\u' + c.toString(16).padStart(4, '0'))
    .join('|'),
  'g',
);

export function mathmlToUnicode(mathml: string): string {
  if (!mathml) return '';
  let root: Element;
  try {
    root = parseXml(mathml);
  } catch {
    return '';
  }
  return walkList(childNodes(root)).replace(INVISIBLE, '').replace(/[ \t]{2,}/g, ' ').trim();
}

// ---- helpers ----
function childNodes(el: Element): Node[] {
  return [...el.childNodes];
}
function elementChildren(el: Element): Element[] {
  return [...el.children];
}
function isMeaningful(node: Node): boolean {
  if (node.nodeType === 3) return (node.textContent ?? '').trim() !== '';
  return node.nodeType === 1;
}
function textOf(el: Element): string {
  return (el.textContent ?? '').trim();
}
/** Map a string to super/subscript all-or-nothing; null if any char is unmapped. */
function mapAll(s: string, table: Record<string, string>): string | null {
  let out = '';
  for (const ch of s) {
    const m = table[ch];
    if (m === undefined) return null;
    out += m;
  }
  return out;
}
function superscript(s: string): string {
  if (!s) return '';
  return mapAll(s, SUPERSCRIPT) ?? `^(${s})`;
}
function subscript(s: string): string {
  if (!s) return '';
  return mapAll(s, SUBSCRIPT) ?? `_(${s})`;
}
/** Parenthesise multi-character groups so fractions/roots stay unambiguous. */
function wrap(s: string): string {
  return [...s].length > 1 ? `(${s})` : s;
}

// ---- walk ----
function walkList(nodes: Node[]): string {
  let out = '';
  for (const node of nodes) {
    if (!isMeaningful(node)) continue;
    out += node.nodeType === 1 ? walkElement(node as Element) : (node.textContent ?? '');
  }
  return out;
}
function walkArg(el: Element | undefined): string {
  if (!el) return '';
  if (el.localName === 'mrow') return walkList(childNodes(el));
  return walkElement(el);
}

function walkElement(el: Element): string {
  const k = elementChildren(el);
  switch (el.localName) {
    case 'math':
    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'merror':
    case 'mtd':
      return walkList(childNodes(el));
    case 'semantics':
      return walkArg(k[0]);
    case 'mi':
    case 'mn':
    case 'mo':
    case 'mtext':
    case 'ms':
      return textOf(el);
    case 'mspace':
      return ' ';
    case 'msup':
      return walkArg(k[0]) + superscript(walkArg(k[1]));
    case 'msub':
      return walkArg(k[0]) + subscript(walkArg(k[1]));
    case 'msubsup':
      return walkArg(k[0]) + subscript(walkArg(k[1])) + superscript(walkArg(k[2]));
    case 'mfrac':
      return `${wrap(walkArg(k[0]))}/${wrap(walkArg(k[1]))}`;
    case 'msqrt':
      return `√${wrap(walkList(childNodes(el)))}`;
    case 'mroot': {
      const radicand = walkArg(k[0]);
      const index = walkArg(k[1]);
      const deg = mapAll(index, SUPERSCRIPT);
      return deg !== null ? `${deg}√${wrap(radicand)}` : `root(${index})(${wrap(radicand)})`;
    }
    case 'munder':
      return walkArg(k[0]) + subscript(walkArg(k[1]));
    case 'mover':
      if (k[1] && k[1].localName === 'mo' && ACCENTS[textOf(k[1])]) {
        return walkArg(k[0]) + ACCENTS[textOf(k[1])];
      }
      return walkArg(k[0]) + superscript(walkArg(k[1]));
    case 'munderover':
      return walkArg(k[0]) + subscript(walkArg(k[1])) + superscript(walkArg(k[2]));
    case 'mtable': {
      const rows = elementChildren(el)
        .filter((r) => r.localName === 'mtr')
        .map((r) =>
          elementChildren(r)
            .filter((c) => c.localName === 'mtd')
            .map((c) => walkList(childNodes(c)))
            .join(', '),
        );
      return `[${rows.join('; ')}]`;
    }
    case 'mfenced': {
      const open = el.getAttribute('open') ?? '(';
      const close = el.getAttribute('close') ?? ')';
      return open + walkList(childNodes(el)) + close;
    }
    default:
      return walkList(childNodes(el));
  }
}
