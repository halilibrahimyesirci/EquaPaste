// Clean-room MathML -> OMML (Office Math Markup Language) converter.
//
// WHY HAND-WRITTEN: every npm MathML->OMML package is LGPL-3.0, which cannot be
// statically bundled into an MIT-licensed extension. This is an independent
// implementation of the element mapping described in the OOXML spec / Microsoft's
// public OfficeMath docs — no GPL/LGPL code was copied.
//
// Output: the INNER OMML (a sequence of `m:*` elements) with the `m:` prefix.
// The clipboard wrapper (clipboard-payload.ts) declares xmlns:m and wraps it in
// <m:oMath> / <m:oMathPara>. Coverage targets the common AI-chat constructs:
// runs, fractions, sub/superscripts, radicals, n-ary operators (sum/int/prod),
// matrices, under/over limits, and accents. Unknown elements degrade to their
// child content rather than being dropped.

import { parseXml, escapeXmlText, escapeXmlAttr } from './xml';

// Operators that become OMML n-ary objects (∑ ∏ ∫ …). U+ comments for clarity.
const NARY_CHARS = new Set([
  '∑', // ∑ sum
  '∏', // ∏ product
  '∐', // ∐ coproduct
  '∫', // ∫ integral
  '∬', // ∬
  '∭', // ∭
  '∮', // ∮ contour
  '∯', // ∯
  '∰', // ∰
  '⋀', // ⋀
  '⋁', // ⋁
  '⋂', // ⋂
  '⋃', // ⋃
  '⨀', // ⨀
  '⨁', // ⨁
  '⨂', // ⨂
  '⨄', // ⨄
  '⨆', // ⨆
]);

// Over/under accent characters Temml emits -> the combining mark Word expects.
const ACCENTS: Record<string, string> = {
  '^': '̂', // hat
  ˆ: '̂', // ˆ
  '~': '̃', // tilde
  '˜': '̃', // ˜
  '¯': '̄', // ¯ macron / bar
  '‾': '̅', // ‾ overline
  '→': '⃗', // → vec
  '⃗': '⃗', // ⃗
  '.': '̇', // dot
  '˙': '̇', // ˙
  '´': '́', // ´ acute
  '`': '̀', // ` grave
};

const SCRIPT_TAGS = new Set(['munderover', 'munder', 'mover', 'msubsup', 'msub', 'msup']);

interface NaryInfo {
  chr: string;
  sub?: Element;
  sup?: Element;
  limLoc: 'undOvr' | 'subSup';
}

export function mathmlToOmml(mathml: string): string {
  const root = parseXml(mathml); // <math>
  return convertList(childNodes(root));
}

// ---- node helpers --------------------------------------------------------
function childNodes(el: Element): Node[] {
  return [...el.childNodes];
}

function elementChildren(el: Element): Element[] {
  return [...el.children];
}

function isMeaningful(node: Node): boolean {
  if (node.nodeType === 3 /* text */) return (node.textContent ?? '').trim() !== '';
  if (node.nodeType !== 1 /* element */) return false;
  return (node as Element).localName !== 'mspace';
}

function textOf(el: Element): string {
  return (el.textContent ?? '').trim();
}

// ---- run output ----------------------------------------------------------
function run(text: string): string {
  if (text === '') return '';
  return `<m:r><m:t xml:space="preserve">${escapeXmlText(text)}</m:t></m:r>`;
}

// ---- list conversion (handles n-ary, which consumes its operand) ---------
function convertList(nodes: Node[]): string {
  const items = nodes.filter(isMeaningful);
  let out = '';
  for (let i = 0; i < items.length; i++) {
    const node = items[i]!;
    const nary = naryInfo(node);
    if (nary) {
      const operand = convertList(items.slice(i + 1));
      return out + buildNary(nary, operand);
    }
    out += convertOne(node);
  }
  return out;
}

function convertOne(node: Node): string {
  if (node.nodeType === 3) return run((node.textContent ?? '').trim());
  if (node.nodeType !== 1) return '';
  return convertElement(node as Element);
}

/** Convert an element used as an argument/box (num, den, base, sub, sup, …). */
function convertArg(el: Element | undefined): string {
  if (!el) return '';
  if (el.localName === 'mrow') return convertList(childNodes(el));
  return convertOne(el);
}

// ---- n-ary detection -----------------------------------------------------
function naryInfo(node: Node): NaryInfo | null {
  if (node.nodeType !== 1) return null;
  let el = node as Element;

  // Temml wraps the operator in its own <mrow>; unwrap a single-child mrow.
  if (el.localName === 'mrow') {
    const kids = elementChildren(el);
    if (kids.length === 1 && kids[0]) el = kids[0];
    else return null;
  }

  const tag = el.localName;
  const kids = elementChildren(el);

  let base: Element | undefined;
  if (SCRIPT_TAGS.has(tag)) base = kids[0];
  else if (tag === 'mo') base = el;
  else return null;

  if (!base || base.localName !== 'mo') return null;
  const chr = textOf(base);
  if (!NARY_CHARS.has(chr)) return null;

  switch (tag) {
    case 'munderover':
      return { chr, sub: kids[1], sup: kids[2], limLoc: 'undOvr' };
    case 'munder':
      return { chr, sub: kids[1], limLoc: 'undOvr' };
    case 'mover':
      return { chr, sup: kids[1], limLoc: 'undOvr' };
    case 'msubsup':
      return { chr, sub: kids[1], sup: kids[2], limLoc: 'subSup' };
    case 'msub':
      return { chr, sub: kids[1], limLoc: 'subSup' };
    case 'msup':
      return { chr, sup: kids[1], limLoc: 'subSup' };
    default: // bare <mo>
      return { chr, limLoc: 'subSup' };
  }
}

function buildNary(info: NaryInfo, operand: string): string {
  const subHide = info.sub ? '' : '<m:subHide m:val="1"/>';
  const supHide = info.sup ? '' : '<m:supHide m:val="1"/>';
  const pr =
    `<m:naryPr><m:chr m:val="${escapeXmlAttr(info.chr)}"/>` +
    `<m:limLoc m:val="${info.limLoc}"/>${subHide}${supHide}<m:ctrlPr/></m:naryPr>`;
  return (
    `<m:nary>${pr}` +
    `<m:sub>${convertArg(info.sub)}</m:sub>` +
    `<m:sup>${convertArg(info.sup)}</m:sup>` +
    `<m:e>${operand}</m:e></m:nary>`
  );
}

// ---- element conversion --------------------------------------------------
function convertElement(el: Element): string {
  const kids = elementChildren(el);
  switch (el.localName) {
    case 'math':
    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'merror':
    case 'mtd':
      return convertList(childNodes(el));

    case 'semantics':
      return convertArg(kids[0]);

    case 'mi':
    case 'mn':
    case 'mtext':
    case 'ms':
    case 'mo':
      return run(textOf(el));

    case 'mspace':
      return '';

    case 'mfrac':
      return (
        `<m:f><m:fPr><m:type m:val="bar"/><m:ctrlPr/></m:fPr>` +
        `<m:num>${convertArg(kids[0])}</m:num><m:den>${convertArg(kids[1])}</m:den></m:f>`
      );

    case 'msup':
      return script('sSup', kids[0], undefined, kids[1]);
    case 'msub':
      return script('sSub', kids[0], kids[1], undefined);
    case 'msubsup':
      return script('sSubSup', kids[0], kids[1], kids[2]);

    case 'msqrt':
      return (
        `<m:rad><m:radPr><m:degHide m:val="1"/><m:ctrlPr/></m:radPr>` +
        `<m:deg/><m:e>${convertList(childNodes(el))}</m:e></m:rad>`
      );
    case 'mroot':
      return (
        `<m:rad><m:radPr><m:degHide m:val="0"/><m:ctrlPr/></m:radPr>` +
        `<m:deg>${convertArg(kids[1])}</m:deg><m:e>${convertArg(kids[0])}</m:e></m:rad>`
      );

    case 'munder':
      return limit('limLow', kids[0], kids[1]);
    case 'mover':
      if (isAccent(kids[1])) return accent(kids[0], kids[1]!);
      return limit('limUpp', kids[0], kids[1]);
    case 'munderover':
      // Non-n-ary (n-ary is caught in convertList): nest lower inside upper.
      return (
        `<m:limUpp><m:limUppPr><m:ctrlPr/></m:limUppPr><m:e>` +
        limit('limLow', kids[0], kids[1]) +
        `</m:e><m:lim>${convertArg(kids[2])}</m:lim></m:limUpp>`
      );

    case 'mtable':
      return matrix(el);

    case 'mfenced':
      return fenced(el);

    default:
      // Unknown element: keep its content rather than dropping it.
      return convertList(childNodes(el));
  }
}

function script(
  kind: 'sSup' | 'sSub' | 'sSubSup',
  base: Element | undefined,
  sub: Element | undefined,
  sup: Element | undefined,
): string {
  const e = `<m:e>${convertArg(base)}</m:e>`;
  if (kind === 'sSup') {
    return `<m:sSup><m:sSupPr><m:ctrlPr/></m:sSupPr>${e}<m:sup>${convertArg(sup)}</m:sup></m:sSup>`;
  }
  if (kind === 'sSub') {
    return `<m:sSub><m:sSubPr><m:ctrlPr/></m:sSubPr>${e}<m:sub>${convertArg(sub)}</m:sub></m:sSub>`;
  }
  return (
    `<m:sSubSup><m:sSubSupPr><m:ctrlPr/></m:sSubSupPr>${e}` +
    `<m:sub>${convertArg(sub)}</m:sub><m:sup>${convertArg(sup)}</m:sup></m:sSubSup>`
  );
}

function limit(
  kind: 'limLow' | 'limUpp',
  base: Element | undefined,
  lim: Element | undefined,
): string {
  return (
    `<m:${kind}><m:${kind}Pr><m:ctrlPr/></m:${kind}Pr>` +
    `<m:e>${convertArg(base)}</m:e><m:lim>${convertArg(lim)}</m:lim></m:${kind}>`
  );
}

function isAccent(el: Element | undefined): boolean {
  return !!el && el.localName === 'mo' && textOf(el) in ACCENTS;
}

function accent(base: Element | undefined, accEl: Element): string {
  const chr = ACCENTS[textOf(accEl)] ?? textOf(accEl);
  return (
    `<m:acc><m:accPr><m:chr m:val="${escapeXmlAttr(chr)}"/><m:ctrlPr/></m:accPr>` +
    `<m:e>${convertArg(base)}</m:e></m:acc>`
  );
}

function matrix(el: Element): string {
  const rows = elementChildren(el).filter((r) => r.localName === 'mtr');
  let body = '';
  for (const row of rows) {
    const cells = elementChildren(row).filter((c) => c.localName === 'mtd');
    let mr = '';
    for (const cell of cells) mr += `<m:e>${convertList(childNodes(cell))}</m:e>`;
    body += `<m:mr>${mr}</m:mr>`;
  }
  return `<m:m><m:mPr><m:ctrlPr/></m:mPr>${body}</m:m>`;
}

function fenced(el: Element): string {
  const open = el.getAttribute('open') ?? '(';
  const close = el.getAttribute('close') ?? ')';
  return (
    `<m:d><m:dPr><m:begChr m:val="${escapeXmlAttr(open)}"/>` +
    `<m:endChr m:val="${escapeXmlAttr(close)}"/><m:ctrlPr/></m:dPr>` +
    `<m:e>${convertList(childNodes(el))}</m:e></m:d>`
  );
}
