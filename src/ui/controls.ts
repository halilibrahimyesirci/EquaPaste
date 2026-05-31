import { h } from './dom';

/** Accessible on/off switch (role=switch). */
export function toggleSwitch(
  checked: boolean,
  label: string,
  onChange: (v: boolean) => void,
): HTMLElement {
  const btn = h('button', {
    class: 'ep-toggle',
    role: 'switch',
    'aria-checked': String(checked),
    'aria-label': label,
    on: {
      click: () => {
        const next = btn.getAttribute('aria-checked') !== 'true';
        btn.setAttribute('aria-checked', String(next));
        onChange(next);
      },
    },
  });
  return btn;
}

/** Segmented single-choice control. */
export function segmented<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
  onChange: (v: T) => void,
): HTMLElement {
  const wrap = h('div', { class: 'ep-seg', role: 'group' });
  const buttons = new Map<T, HTMLButtonElement>();
  for (const o of options) {
    const b = h('button', {
      type: 'button',
      text: o.label,
      'aria-pressed': String(o.value === value),
      on: {
        click: () => {
          for (const [v, el] of buttons) el.setAttribute('aria-pressed', String(v === o.value));
          onChange(o.value);
        },
      },
    });
    buttons.set(o.value, b);
    wrap.append(b);
  }
  return wrap;
}

/** Toggle chip. */
export function chip(label: string, pressed: boolean, onChange: (v: boolean) => void): HTMLElement {
  const c = h('button', {
    class: 'ep-chip',
    'aria-pressed': String(pressed),
    text: label,
    on: {
      click: () => {
        const next = c.getAttribute('aria-pressed') !== 'true';
        c.setAttribute('aria-pressed', String(next));
        onChange(next);
      },
    },
  });
  return c;
}
