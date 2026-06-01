import '../../ui/page.css';
import { h, applyTheme } from '../../ui/dom';
import { toggleSwitch, chip } from '../../ui/controls';
import { MVP_TARGET_ORDER, getTarget } from '../../core/targets';
import { getSettings, setSettings, type PlatformId, type Settings } from '../../shared/settings';

const PLATFORM_LABELS: Record<PlatformId, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  deepseek: 'DeepSeek',
};

async function render(): Promise<void> {
  const settings = await getSettings();
  applyTheme(settings.theme);
  document.body.style.width = '320px';

  const app = document.getElementById('app')!;
  app.replaceChildren();
  app.style.padding = '0';

  // header
  const master = toggleSwitch(
    settings.enabled,
    'Enable EquaPaste',
    (v) => void setSettings({ enabled: v }),
  );
  const header = h(
    'div',
    {
      style:
        'display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--ep-border)',
    },
    h(
      'span',
      { class: 'ep-brand' },
      h('span', { class: 'ep-brand__mark', text: 'Σ' }),
      document.createTextNode('EquaPaste'),
    ),
    master,
  );

  // default target
  const select = h('select', {
    'aria-label': 'Default target',
    on: {
      change: (e) =>
        void setSettings({
          defaultTarget: (e.target as HTMLSelectElement).value as Settings['defaultTarget'],
        }),
    },
  });
  for (const id of MVP_TARGET_ORDER) {
    const opt = h('option', { value: id, text: getTarget(id).label });
    if (id === settings.defaultTarget) opt.selected = true;
    select.append(opt);
  }
  const defaultSection = h(
    'div',
    { style: 'padding:14px 16px;display:flex;flex-direction:column;gap:8px' },
    h('span', { class: 'ep-section-label', text: 'Default target' }),
    select,
  );

  // shortcut
  const shortcutSection = h(
    'div',
    { style: 'padding:0 16px 14px;display:flex;flex-direction:column;gap:8px' },
    h('span', { class: 'ep-section-label', text: 'Shortcut' }),
    h(
      'div',
      { class: 'ep-row' },
      h('span', { text: 'Copy to default' }),
      h(
        'span',
        { style: 'display:flex;align-items:center;gap:8px' },
        h('span', { class: 'ep-kbd', text: '⌥⇧E' }),
        h('a', {
          href: '#',
          text: 'Change',
          on: {
            click: (e) => {
              e.preventDefault();
              void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            },
          },
        }),
      ),
    ),
  );

  // platforms
  const chips = h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px' });
  for (const p of Object.keys(PLATFORM_LABELS) as PlatformId[]) {
    chips.append(
      chip(
        PLATFORM_LABELS[p],
        settings.platforms[p],
        (v) => void setSettings({ platforms: { ...settings.platforms, [p]: v } }),
      ),
    );
  }
  const platformSection = h(
    'div',
    { style: 'padding:0 16px 16px;display:flex;flex-direction:column;gap:8px' },
    h('span', { class: 'ep-section-label', text: 'Active on' }),
    chips,
  );

  // how it works
  const howItWorks = h(
    'div',
    { style: 'padding:0 16px 16px;display:flex;flex-direction:column;gap:8px' },
    h('span', { class: 'ep-section-label', text: 'How it works' }),
    h(
      'div',
      { class: 'ep-help' },
      h(
        'p',
        { class: 'ep-help__item' },
        h('strong', { text: 'Desktop Word — ' }),
        document.createTextNode('copy, then paste ('),
        h('span', { class: 'ep-kbd', text: 'Ctrl/⌘V' }),
        document.createTextNode('). It drops in as a native, editable equation — no fuss.'),
      ),
      h(
        'p',
        { class: 'ep-help__item' },
        h('strong', { text: 'Word Online — ' }),
        document.createTextNode(
          'paste as Plain text. Or copy as LaTeX, paste it, select it, then use the top ',
        ),
        h('strong', { text: 'Insert ▸ Equation' }),
        document.createTextNode(' to turn it into a real equation automatically.'),
      ),
    ),
  );

  // footer
  const version = chrome.runtime.getManifest().version;
  const footer = h(
    'div',
    {
      style:
        'padding:12px 16px;border-top:1px solid var(--ep-border);display:flex;flex-direction:column;gap:8px',
    },
    h('span', { class: 'ep-badge' }, document.createTextNode('🔒 No servers · No tracking')),
    h(
      'div',
      { class: 'ep-row ep-muted', style: 'font-size:11px' },
      h('a', {
        href: '#',
        text: 'Settings',
        on: {
          click: (e) => {
            e.preventDefault();
            void chrome.runtime.openOptionsPage();
          },
        },
      }),
      h('span', { text: `v${version}` }),
    ),
  );

  app.append(header, defaultSection, shortcutSection, platformSection, howItWorks, footer);
}

void render();
