import { latexToMathml } from '../core/latex-to-mathml';

// Equation -> PNG for the Google Docs path (image + LaTeX alt text).
// Native Docs equations are impossible via clipboard, so this is best-effort by
// design: we render the MathML inside an SVG <foreignObject> and rasterise it.
// Some browsers taint the canvas for foreignObject content; if so, toBlob throws
// and copy.ts falls back to copying the raw LaTeX with an honest message.

const FONT_PX = 24;
const SCALE = 3; // crispness on zoom/print
const PAD = 8;

export async function renderEquationPng(latex: string, display: boolean): Promise<Blob> {
  const mathml = latexToMathml(latex, display);
  const { width, height } = measure(mathml);
  const w = width + PAD * 2;
  const h = height + PAD * 2;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" ` +
    `style="font-size:${FONT_PX}px;color:#111111;padding:${PAD}px;display:inline-block;line-height:1.2;">` +
    mathml +
    `</div></foreignObject></svg>`;

  return rasterize(svg, w, h);
}

/** Render the MathML off-screen to get its natural pixel size. */
function measure(mathml: string): { width: number; height: number } {
  const holder = document.createElement('div');
  holder.setAttribute(
    'style',
    `position:fixed;left:-99999px;top:0;font-size:${FONT_PX}px;visibility:hidden;`,
  );
  holder.innerHTML = mathml;
  document.body.appendChild(holder);
  const rect = (holder.firstElementChild as HTMLElement | null)?.getBoundingClientRect();
  document.body.removeChild(holder);
  return {
    width: Math.max(1, Math.ceil(rect?.width ?? 1)),
    height: Math.max(1, Math.ceil(rect?.height ?? FONT_PX * 1.4)),
  };
}

function rasterize(svg: string, w: number, h: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = w * SCALE;
        canvas.height = h * SCALE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No 2D context'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Equation image could not be rendered'));
        }, 'image/png');
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => reject(new Error('Equation SVG failed to load'));
    img.src = url;
  });
}
