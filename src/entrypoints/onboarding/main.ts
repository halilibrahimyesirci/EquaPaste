import '../../ui/page.css';
import { h } from '../../ui/dom';
import { convertEquation } from '../../core/convert';
import { buildPayload } from '../../core/targets';
import { writeClipboard } from '../../shared/clipboard';
import { latexToMathml } from '../../core/latex-to-mathml';

const SAMPLE = 'E = mc^2';

function step(n: number, text: string): HTMLElement {
  return h(
    'li',
    { style: 'display:flex;align-items:flex-start;gap:10px;margin:0' },
    h('span', {
      text: String(n),
      style:
        'flex:none;width:20px;height:20px;border-radius:50%;background:var(--ep-accent);color:var(--ep-on-accent);font-size:12px;font-weight:700;display:grid;place-items:center',
    }),
    h('span', { text }),
  );
}

function render(): void {
  const app = document.getElementById('app')!;
  app.replaceChildren();

  // hero
  const hero = h(
    'header',
    { style: 'text-align:center;display:flex;flex-direction:column;gap:8px;align-items:center' },
    h(
      'span',
      { class: 'ep-brand', style: 'font-size:22px' },
      h('span', { class: 'ep-brand__mark', text: 'Σ' }),
      document.createTextNode('EquaPaste'),
    ),
    h('h1', {
      text: 'Copy any equation. Paste it for real.',
      style: 'margin:8px 0 0;font-size:26px;letter-spacing:-0.01em',
    }),
    h('p', {
      class: 'ep-muted',
      style: 'margin:0;max-width:42ch;font-size:15px',
      text: 'EquaPaste turns rendered math in ChatGPT, Claude & Gemini into native, editable equations — 100% on your device.',
    }),
  );

  // demo card
  const equationBox = h('div', {
    style: 'font-size:26px;flex:1;min-width:0',
    html: latexToMathml(SAMPLE, true),
  });

  const pill = h('button', {
    class: 'ep-btn ep-btn--primary',
    style: 'display:inline-flex;align-items:center;gap:8px;white-space:nowrap',
    on: { click: () => void onCopy() },
  });
  const pillIcon = h('span', { text: 'Σ', style: 'font-weight:700' });
  const pillLabel = h('span', { text: 'Copy to Word' });
  pill.append(pillIcon, pillLabel);

  const coach = h('div', {
    class: 'ep-badge',
    style: 'margin-top:14px;display:none',
  });

  async function onCopy(): Promise<void> {
    try {
      const eq = convertEquation({ latex: SAMPLE, display: true });
      await writeClipboard(buildPayload('word', eq));
      pillIcon.textContent = '✓';
      pillLabel.textContent = 'Copied to Word';
      coach.textContent = '✓ Copied! Now open Word and press Ctrl/⌘+V.';
      coach.style.display = 'inline-flex';
      window.setTimeout(() => {
        pillIcon.textContent = 'Σ';
        pillLabel.textContent = 'Copy to Word';
      }, 2000);
    } catch {
      coach.textContent = 'Copy failed — check clipboard permissions.';
      coach.style.display = 'inline-flex';
    }
  }

  const demo = h(
    'section',
    { class: 'ep-card', style: 'padding:24px;display:flex;flex-direction:column;gap:16px' },
    h('span', { class: 'ep-section-label', text: 'Sample equation' }),
    h(
      'div',
      { style: 'display:flex;align-items:center;gap:16px;flex-wrap:wrap' },
      equationBox,
      pill,
    ),
    h(
      'ol',
      {
        style:
          'list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px;font-size:14px',
      },
      step(1, 'Click “Copy to Word”.'),
      step(2, 'Open Word (or Word Online) and press Ctrl/⌘+V.'),
      step(3, 'It pastes as a real, editable equation ✨'),
    ),
    coach,
  );

  // also-works chips
  const chips = h(
    'div',
    { style: 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center' },
    h('span', { class: 'ep-muted', style: 'font-size:13px', text: 'Also works in:' }),
  );
  for (const name of ['Notion', 'Obsidian', 'Markdown', 'Google Docs', 'Word Online']) {
    chips.append(h('span', { class: 'ep-chip', 'aria-pressed': 'true', text: name }));
  }

  // CTAs
  const ctas = h(
    'div',
    { style: 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap' },
    h('button', {
      class: 'ep-btn',
      text: 'Open settings',
      on: { click: () => void chrome.runtime.openOptionsPage() },
    }),
    h('button', {
      class: 'ep-btn ep-btn--primary',
      text: 'Pin EquaPaste ▸',
      on: {
        click: (e) => {
          const hint = h('span', {
            class: 'ep-muted',
            style: 'font-size:12px;margin-left:8px',
            text: 'Click the puzzle 🧩 icon in your toolbar, then pin EquaPaste.',
          });
          (e.currentTarget as HTMLElement).after(hint);
        },
      },
    }),
  );

  // trust footer
  const footer = h(
    'footer',
    { style: 'text-align:center;color:var(--ep-text-muted);font-size:12px' },
    h('span', { text: '🔒 No servers · No tracking · ' }),
    h('a', { href: 'https://github.com', text: 'Open source' }),
  );

  const main = h(
    'main',
    {
      style:
        'max-width:560px;margin:0 auto;padding:48px 20px;display:flex;flex-direction:column;gap:28px',
    },
    hero,
    demo,
    chips,
    ctas,
    footer,
  );
  app.append(main);
}

render();
