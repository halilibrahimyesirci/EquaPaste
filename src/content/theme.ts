// Decide whether the pill should render in light or dark mode based on the
// ACTUAL surface the equation sits on (a dark code block on a light page, etc.),
// not just the OS preference.

/** Parse an rgb()/rgba() color string to [r,g,b] (0–255) or null if transparent. */
function parseRgb(color: string): [number, number, number] | null {
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m || !m[1]) return null;
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  const [r, g, b, a] = parts;
  if (r === undefined || g === undefined || b === undefined) return null;
  if (a !== undefined && a === 0) return null; // fully transparent — keep looking
  return [r, g, b];
}

/** Walk ancestors until an opaque background is found; fall back to body/white. */
export function effectiveBackground(el: Element): [number, number, number] {
  let node: Element | null = el;
  while (node) {
    const bg = getComputedStyle(node).backgroundColor;
    const rgb = parseRgb(bg);
    if (rgb) return rgb;
    node = node.parentElement;
  }
  const bodyBg = parseRgb(getComputedStyle(document.body).backgroundColor);
  return bodyBg ?? [255, 255, 255];
}

/** WCAG relative luminance (0–1) with sRGB gamma. */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number): number => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** 'dark' if the equation's surface is dark; robust 0.5 split avoids edge flicker. */
export function themeForElement(el: Element): 'light' | 'dark' {
  return relativeLuminance(effectiveBackground(el)) < 0.5 ? 'dark' : 'light';
}
