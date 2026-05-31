import '../../ui/page.css';
import { h, applyTheme } from '../../ui/dom';
import { toggleSwitch, segmented, chip } from '../../ui/controls';
import { MVP_TARGET_ORDER, getTarget } from '../../core/targets';
import type { WordStrategy } from '../../core/clipboard-payload';
import { getSettings, setSettings, type PlatformId, type Settings } from '../../shared/settings';

const PLATFORM_LABELS: Record<PlatformId, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
};
// How the "Word" target builds its clipboard payload. MathML is the working
// default; the others are for troubleshooting on unusual Word builds.
const WORD_STRATEGIES: ReadonlyArray<{ value: WordStrategy; label: string }> = [
  { value: 'mathml', label: 'MathML — native Word equation (default)' },
  { value: 'latex-text', label: '$$…$$ LaTeX — Word auto-converts' },
  { value: 'omml-html', label: 'OMML in HTML — experimental (usually empty)' },
];

let saveTimer = 0;
function flashSaved(live: HTMLElement): void {
  window.clearTimeout(saveTimer);
  live.textContent = 'Saved ✓';
  saveTimer = window.setTimeout(() => (live.textContent = ''), 1400);
}

function card(title: string, ...rows: Array<Node>): HTMLElement {
  return h(
    'section',
    { class: 'ep-card', style: 'padding:16px;display:flex;flex-direction:column;gap:14px' },
    h('h2', { text: title, style: 'margin:0;font-size:15px' }),
    ...rows,
  );
}

function row(label: string, control: Node, hint?: string): HTMLElement {
  const left = h(
    'div',
    { style: 'display:flex;flex-direction:column;gap:2px' },
    h('span', { text: label }),
  );
  if (hint) left.append(h('span', { class: 'ep-muted', style: 'font-size:12px', text: hint }));
  return h('div', { class: 'ep-row', style: 'min-height:36px' }, left, control as HTMLElement);
}

async function render(): Promise<void> {
  const settings = await getSettings();
  applyTheme(settings.theme);

  const app = document.getElementById('app')!;
  app.replaceChildren();

  const live = h('div', {
    role: 'status',
    'aria-live': 'polite',
    style:
      'position:fixed;top:12px;right:16px;color:var(--ep-success-fg);font-weight:600;font-size:13px',
  });
  const save = (patch: Partial<Settings>): void => {
    void setSettings(patch);
    flashSaved(live);
  };

  // --- General ---
  const themeSeg = segmented(
    [
      { value: 'auto', label: 'Auto' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
    settings.theme,
    (v) => {
      applyTheme(v);
      save({ theme: v });
    },
  );

  const targetSelect = h('select', {
    'aria-label': 'Default target',
    on: {
      change: (e) =>
        save({ defaultTarget: (e.target as HTMLSelectElement).value as Settings['defaultTarget'] }),
    },
  });
  for (const id of MVP_TARGET_ORDER) {
    const opt = h('option', { value: id, text: getTarget(id).label });
    if (id === settings.defaultTarget) opt.selected = true;
    targetSelect.append(opt);
  }

  const pillSideSeg = segmented(
    [
      { value: 'top-right', label: 'Top-right' },
      { value: 'top-left', label: 'Top-left' },
    ],
    settings.pillSide,
    (v) => save({ pillSide: v }),
  );

  const general = card(
    'General',
    row('Theme', themeSeg),
    row('Default target', targetSelect, 'Used by one-click copy and the keyboard shortcut.'),
    row(
      'Click an equation to copy',
      toggleSwitch(settings.clickEquationToCopy, 'Click an equation to copy', (v) =>
        save({ clickEquationToCopy: v }),
      ),
      'Click anywhere on a display equation to copy it.',
    ),
    row('Pill position', pillSideSeg),
  );

  // --- Word ---
  const wordSelect = h('select', {
    'aria-label': 'Word clipboard format',
    on: {
      change: (e) => save({ wordStrategy: (e.target as HTMLSelectElement).value as WordStrategy }),
    },
  });
  for (const s of WORD_STRATEGIES) {
    const opt = h('option', { value: s.value, text: s.label });
    if (s.value === settings.wordStrategy) opt.selected = true;
    wordSelect.append(opt);
  }
  const word = card(
    'Word format',
    row(
      'Clipboard format',
      wordSelect,
      'How the Word target builds the clipboard. MathML pastes a native equation on Word 2016+/365.',
    ),
  );

  // --- Targets reference ---
  const targetList = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
  for (const id of MVP_TARGET_ORDER) {
    const t = getTarget(id);
    targetList.append(
      h(
        'div',
        { style: 'display:flex;flex-direction:column;gap:2px' },
        h(
          'div',
          { style: 'display:flex;align-items:center;gap:8px' },
          h('strong', { text: t.label }),
          h('span', {
            class: 'ep-muted',
            style: 'font-size:11px',
            text: t.confidence === 'high' ? 'reliable' : 'best-effort',
          }),
        ),
        t.note
          ? h('span', { class: 'ep-muted', style: 'font-size:12px', text: t.note })
          : document.createTextNode(''),
      ),
    );
  }
  const targets = card('Supported targets', targetList);

  // --- Platforms ---
  const chips = h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px' });
  for (const p of Object.keys(PLATFORM_LABELS) as PlatformId[]) {
    chips.append(
      chip(PLATFORM_LABELS[p], settings.platforms[p], (v) =>
        save({ platforms: { ...settings.platforms, [p]: v } }),
      ),
    );
  }
  const platforms = card('Active on', chips);

  // --- Shortcuts ---
  const shortcuts = card(
    'Shortcuts',
    row(
      'Copy to default · Copy LaTeX',
      h('a', {
        href: '#',
        text: 'Edit shortcuts',
        on: {
          click: (e) => {
            e.preventDefault();
            void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
          },
        },
      }),
      'Defaults: ⌥⇧E and ⌥⇧L',
    ),
  );

  // --- Privacy ---
  const privacy = card(
    'Privacy',
    h('span', { class: 'ep-badge' }, document.createTextNode('🔒 No servers · No tracking')),
    h(
      'ul',
      { class: 'ep-muted', style: 'margin:0;padding-left:18px;font-size:13px;line-height:1.7' },
      h('li', { text: 'Runs fully offline — conversion happens in your browser.' }),
      h('li', { text: 'No analytics, no account, no external requests.' }),
      h('li', { text: 'Equations never leave your device.' }),
    ),
  );

  // --- About ---
  const version = chrome.runtime.getManifest().version;
  const about = card(
    'About',
    row('Version', h('span', { text: `v${version}` })),
    row('License', h('span', { text: 'MIT — open source' })),
  );

  const headerBar = h(
    'header',
    { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px' },
    h(
      'span',
      { class: 'ep-brand', style: 'font-size:18px' },
      h('span', { class: 'ep-brand__mark', text: 'Σ' }),
      document.createTextNode('EquaPaste'),
    ),
    h('span', { class: 'ep-muted', text: 'Settings' }),
  );

  const main = h(
    'main',
    {
      style:
        'max-width:640px;margin:0 auto;padding:32px 20px 64px;display:flex;flex-direction:column;gap:16px',
    },
    headerBar,
    general,
    word,
    targets,
    platforms,
    shortcuts,
    privacy,
    about,
  );
  app.append(live, main);
}

void render();
